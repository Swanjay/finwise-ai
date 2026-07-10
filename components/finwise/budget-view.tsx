'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Target, TrendingUp, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinwise } from '@/components/finwise-store'
import {
  formatIDR,
  filterByMonth,
  getMonthKey,
  EXPENSE_CATEGORIES,
  type CategoryId,
} from '@/lib/finwise'
import { cn } from '@/lib/utils'

// Color by usage zone
function barColor(pct: number): string {
  if (pct >= 90) return '#e11d48' // rose — danger
  if (pct >= 75) return '#f59e0b' // amber — warning
  return '#2ead4b' // green — ok
}

export function BudgetView() {
  const { transactions, budgets, setBudget, monthlyIncome } = useFinwise()
  const [applied, setApplied] = useState(false)

  const currentMonth = getMonthKey(new Date())
  const monthTx = useMemo(() => filterByMonth(transactions, currentMonth), [transactions, currentMonth])

  // Auto-budget suggestions based on 3-month average
  const autoSuggestions = useMemo(() => {
    const months: string[] = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push(getMonthKey(d))
    }
    const catTotals: Record<string, { total: number; count: number }> = {}
    for (const mKey of months) {
      const mTx = filterByMonth(transactions, mKey)
      for (const cat of EXPENSE_CATEGORIES) {
        const spent = mTx
          .filter((t) => t.type === 'expense' && t.category === cat.id)
          .reduce((s, t) => s + t.amount, 0)
        if (spent > 0) {
          if (!catTotals[cat.id]) catTotals[cat.id] = { total: 0, count: 0 }
          catTotals[cat.id].total += spent
          catTotals[cat.id].count++
        }
      }
    }
    return EXPENSE_CATEGORIES.filter((cat) => catTotals[cat.id])
      .map((cat) => {
        const data = catTotals[cat.id]
        const avg = Math.round(data.total / data.count)
        const suggested = Math.ceil(avg / 50000) * 50000
        return { id: cat.id, label: cat.label, icon: cat.icon, color: cat.color, avg, suggested }
      })
      .sort((a, b) => b.avg - a.avg)
  }, [transactions])

  const suggestedTotal = useMemo(
    () => autoSuggestions.reduce((s, x) => s + x.suggested, 0),
    [autoSuggestions],
  )
  const avgDaily = useMemo(
    () => (suggestedTotal > 0 ? Math.round(suggestedTotal / 30) : 0),
    [suggestedTotal],
  )

  // Current month per-category spent vs budget
  const categories = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => {
      const spent = monthTx
        .filter((t) => t.type === 'expense' && t.category === cat.id)
        .reduce((s, t) => s + t.amount, 0)
      const budget = budgets[cat.id] || 0
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0
      return {
        id: cat.id,
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
        spent,
        budget,
        pct,
        over: spent > budget && budget > 0,
      }
    }).filter((c) => c.budget > 0 || c.spent > 0)
  }, [monthTx, budgets, monthTx])

  function applySuggestions() {
    for (const s of autoSuggestions) setBudget(s.id as CategoryId, s.suggested)
    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* AI Suggested Budget Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-emerald-600 p-4 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" />
          <p className="text-xs font-semibold opacity-90">Saran AI — Budget Bulan Ini</p>
        </div>
        <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums">
          {formatIDR(suggestedTotal)}
        </p>
        <p className="mt-1 text-[11px] opacity-90">
          Dihitung dari rata² pengeluaran 3 bulan terakhir
          {avgDaily > 0 && ` (${formatIDR(avgDaily)}/hari)`}.
        </p>
        <Button
          onClick={applySuggestions}
          size="sm"
          className="mt-3 bg-white text-primary hover:bg-white/90 font-bold gap-1.5"
        >
          {applied ? <Check className="size-4" /> : <Sparkles className="size-4" />}
          {applied ? 'Diterapkan!' : 'Terapkan Saran'}
        </Button>
      </div>

      {/* Per-category budget bars */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Target className="size-4 text-primary" /> Budget per Kategori
          </h3>
          <span className="text-[11px] font-semibold text-muted-foreground">+ Baru</span>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada budget. Tap <strong>Terapkan Saran</strong> di atas atau atur manual.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((c) => {
              const Icon = c.icon
              return (
                <div key={c.id} className="rounded-xl bg-card p-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      {Icon && <Icon className="size-3.5" style={{ color: c.color }} />}
                      {c.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatIDR(c.spent)} / {c.budget > 0 ? formatIDR(c.budget) : '—'}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(c.pct, 100)}%`,
                        backgroundColor: c.budget > 0 ? barColor(c.pct) : c.color,
                      }}
                    />
                  </div>
                  <p className={cn('mt-1 text-[10px]', c.over ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                    {c.budget > 0
                      ? c.over
                        ? `${c.pct}% terpakai · over ${formatIDR(c.spent - c.budget)}`
                        : `${c.pct}% terpakai · sisa ${formatIDR(c.budget - c.spent)}`
                      : `Rp${formatIDR(c.spent)} bulan ini`}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Suggestions list (if not yet applied) */}
      {autoSuggestions.length > 0 && !applied && (
        <div className="rounded-2xl bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="size-4 text-primary" />
            <p className="text-sm font-semibold">Saran per Kategori</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {autoSuggestions.slice(0, 6).map((s) => {
              const Icon = s.icon
              return (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  {Icon && <Icon className="size-3.5" style={{ color: s.color }} />}
                  <span className="flex-1">{s.label}</span>
                  <span className="text-muted-foreground">{formatIDR(s.avg)}/bln avg</span>
                  <span className="font-semibold text-primary">{formatIDR(s.suggested)}</span>
                </div>
              )
            })}
          </div>
          <Button onClick={applySuggestions} variant="outline" size="sm" className="mt-3 w-full gap-1.5">
            <Plus className="size-4" /> Terapkan Semua
          </Button>
        </div>
      )}
    </div>
  )
}

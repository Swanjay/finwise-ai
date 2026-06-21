'use client'

import { useState, useMemo } from 'react'
import { Sparkles, RotateCcw, Copy, ChevronRight, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFinwise } from '@/components/finwise-store'
import {
  formatIDR,
  filterByMonth,
  getMonthKey,
  getMonthLabel,
  spendingByCategory,
  BUILTIN_CATEGORIES,
  EXPENSE_CATEGORIES,
  type Category,
} from '@/lib/finwise'
import { cn } from '@/lib/utils'

// Budget templates for common Indonesian lifestyles
const BUDGET_TEMPLATES: { id: string; name: string; emoji: string; desc: string; budgets: Record<string, number> }[] = [
  {
    id: 'mahasiswa',
    name: 'Mahasiswa',
    emoji: '🎓',
    desc: 'Budget hemat untuk anak kos',
    budgets: { food: 1500000, transport: 300000, entertainment: 200000, internet: 150000, education: 500000 },
  },
  {
    id: 'karyawan',
    name: 'Karyawan',
    emoji: '💼',
    desc: 'Budget standar karyawan',
    budgets: { food: 3000000, transport: 1000000, shopping: 1000000, entertainment: 500000, bills: 1500000, internet: 300000, health: 300000 },
  },
  {
    id: 'keluarga',
    name: 'Keluarga',
    emoji: '👨‍👩‍👧‍👦',
    desc: 'Budget keluarga kecil',
    budgets: { food: 5000000, transport: 2000000, shopping: 2000000, bills: 3000000, health: 1000000, education: 2000000, internet: 500000 },
  },
  {
    id: 'freelancer',
    name: 'Freelancer',
    emoji: '💻',
    desc: 'Budget income tidak tetap',
    budgets: { food: 2000000, transport: 500000, internet: 500000, entertainment: 300000, health: 500000, bills: 1000000 },
  },
]

export function SmartBudgetSheet({ onClose }: { onClose: () => void }) {
  const { transactions, budgets, setBudget, monthlyIncome } = useFinwise()
  const [activeTab, setActiveTab] = useState<'templates' | 'auto' | 'rollover'>('templates')
  
  const currentMonth = getMonthKey(new Date())
  const prevMonth = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return getMonthKey(d)
  })()

  const currentMonthTx = filterByMonth(transactions, currentMonth)
  const prevMonthTx = filterByMonth(transactions, prevMonth)

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
        const spent = mTx.filter((t) => t.type === 'expense' && t.category === cat.id).reduce((s, t) => s + t.amount, 0)
        if (spent > 0) {
          if (!catTotals[cat.id]) catTotals[cat.id] = { total: 0, count: 0 }
          catTotals[cat.id].total += spent
          catTotals[cat.id].count++
        }
      }
    }

    return EXPENSE_CATEGORIES
      .filter((cat) => catTotals[cat.id])
      .map((cat) => {
        const data = catTotals[cat.id]
        const avg = Math.round(data.total / data.count)
        const rounded = Math.ceil(avg / 50000) * 50000 // Round up to nearest 50k
        return { category: cat, avg, suggested: rounded, current: budgets[cat.id] || 0 }
      })
      .sort((a, b) => b.avg - a.avg)
  }, [transactions, budgets])

  // Rollover analysis — budget yang belum habis bulan lalu
  const rolloverData = useMemo(() => {
    return EXPENSE_CATEGORIES
      .map((cat) => {
        const budget = budgets[cat.id] || 0
        if (!budget) return null
        const prevSpent = prevMonthTx.filter((t) => t.type === 'expense' && t.category === cat.id).reduce((s, t) => s + t.amount, 0)
        const currentSpent = currentMonthTx.filter((t) => t.type === 'expense' && t.category === cat.id).reduce((s, t) => s + t.amount, 0)
        const remaining = budget - prevSpent
        const rolloverAmount = remaining > 0 ? remaining : 0
        return {
          category: cat,
          budget,
          prevSpent,
          currentSpent,
          rolloverAmount,
          effectiveBudget: budget + rolloverAmount,
          overBudget: currentSpent > budget,
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.rolloverAmount) - (a!.rolloverAmount))
  }, [budgets, prevMonthTx, currentMonthTx])

  function applyTemplate(templateId: string) {
    const template = BUDGET_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    for (const [catId, amount] of Object.entries(template.budgets)) {
      setBudget(catId, amount)
    }
  }

  function applyAutoSuggestions() {
    for (const s of autoSuggestions) {
      setBudget(s.category.id, s.suggested)
    }
  }

  return (
    <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'templates' as const, label: 'Template', emoji: '📋' },
          { id: 'auto' as const, label: 'Auto Budget', emoji: '🤖' },
          { id: 'rollover' as const, label: 'Rollover', emoji: '🔄' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 rounded-xl px-3 py-2 text-xs font-medium transition',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Template Tab */}
      {activeTab === 'templates' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Pilih template budget sesuai gaya hidupmu. Budget bisa diubah setelah diterapkan.
          </p>
          {BUDGET_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template.id)}
              className="clay-card flex items-start gap-3 p-3 text-left transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="text-2xl">{template.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.desc}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {Object.entries(template.budgets).slice(0, 4).map(([catId, amount]) => (
                    <span key={catId} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      {BUILTIN_CATEGORIES[catId]?.label || catId}: {formatIDR(amount)}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-1" />
            </button>
          ))}
        </div>
      )}

      {/* Auto Budget Tab */}
      {activeTab === 'auto' && (
        <div className="flex flex-col gap-3">
          <div className="clay-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-4 text-primary" />
              <p className="text-sm font-semibold">Saran Budget Otomatis</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Berdasarkan rata-rata pengeluaran 3 bulan terakhir, dibulatkan ke Rp50rb terdekat.
            </p>
            {autoSuggestions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {autoSuggestions.map((s) => {
                  const diff = s.suggested - s.current
                  return (
                    <div key={s.category.id} className="flex items-center gap-2 text-sm">
                      <span className="text-xs">{s.category.icon && <s.category.icon className="size-3.5" style={{ color: s.category.color }} />}</span>
                      <span className="flex-1 text-xs">{s.category.label}</span>
                      <span className="text-xs text-muted-foreground">{formatIDR(s.avg)}/bln avg</span>
                      <span className="text-xs font-semibold text-primary">{formatIDR(s.suggested)}</span>
                      {s.current > 0 && diff !== 0 && (
                        <span className={cn('text-[10px]', diff > 0 ? 'text-orange-500' : 'text-green-500')}>
                          {diff > 0 ? '↑' : '↓'}{formatIDR(Math.abs(diff))}
                        </span>
                      )}
                    </div>
                  )
                })}
                <Button onClick={applyAutoSuggestions} className="mt-2 gap-2">
                  <Sparkles className="size-4" /> Terapkan Semua Saran
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum cukup data. Catat transaksi minimal 1 bulan untuk mendapat saran.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rollover Tab */}
      {activeTab === 'rollover' && (
        <div className="flex flex-col gap-3">
          <div className="clay-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw className="size-4 text-primary" />
              <p className="text-sm font-semibold">Budget Rollover</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Sisa budget bulan lalu bisa ditambahkan ke bulan ini. Ini membantu mengontrol pengeluaran yang fluktuatif.
            </p>
            
            {rolloverData.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {rolloverData.map((item) => item && (
                  <div key={item.category.id} className="flex items-center gap-2">
                    <span className="text-xs">{item.category.icon && <item.category.icon className="size-3.5" style={{ color: item.category.color }} />}</span>
                    <span className="flex-1 text-xs">{item.category.label}</span>
                    <div className="text-right">
                      {item.rolloverAmount > 0 ? (
                        <span className="text-xs font-medium text-green-500">+{formatIDR(item.rolloverAmount)} sisa</span>
                      ) : item.overBudget ? (
                        <span className="text-xs font-medium text-red-500 dark:text-red-400">Over {formatIDR(Math.abs(item.budget - item.prevSpent))}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pas</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada budget yang diatur. Atur budget dulu ya!
              </p>
            )}
          </div>
          
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tips Rollover:</strong> Kalau budget makan bulan lalu sisa Rp200rb, 
              bulan ini kamu bisa makan lebih banyak TETAPI jangan jadikan itu alasan untuk boros!
            </p>
          </div>
        </div>
      )}

      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

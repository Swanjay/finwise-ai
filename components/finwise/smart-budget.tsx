'use client'

import { useState, useMemo } from 'react'
import { Sparkles, RotateCcw, Copy, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Target, ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'
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

// 50/30/20 Budget Rule zones
const FIFTY_THIRTY_ZONES: {
  id: string
  label: string
  emoji: string
  color: string
  defaultPct: number
  categories: string[]
}[] = [
  {
    id: 'needs',
    label: 'Kebutuhan',
    emoji: '🏠',
    color: '#10B981',
    defaultPct: 50,
    categories: ['food', 'bills', 'transport', 'internet', 'health'],
  },
  {
    id: 'wants',
    label: 'Keinginan',
    emoji: '🎮',
    color: '#EC4899',
    defaultPct: 30,
    categories: ['shopping', 'entertainment'],
  },
  {
    id: 'savings',
    label: 'Tabungan',
    emoji: '💰',
    color: '#6366F1',
    defaultPct: 20,
    categories: ['education'],
  },
]

export function SmartBudgetSheet({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const { transactions, budgets, setBudget, monthlyIncome, wallets } = useFinwise()
  const [activeTab, setActiveTab] = useState<'templates' | 'auto' | 'rollover' | '5030' | 'manual'>('templates')
  const [zonePcts, setZonePcts] = useState({ needs: 50, wants: 30, savings: 20 })
  const [manualDrafts, setManualDrafts] = useState<Record<string, string>>({})
  
  // 50/30/20 Base Amount config
  const [baseSource, setBaseSource] = useState<'income' | 'balance' | 'custom'>('income')
  const [customBase, setCustomBase] = useState<string>('')
  
  const totalWalletBalance = useMemo(() => wallets.reduce((sum, w) => sum + (w.balance || 0), 0), [wallets])
  
  const baseAmount = useMemo(() => {
    if (baseSource === 'balance') return totalWalletBalance
    if (baseSource === 'custom') return Number(customBase.replace(/\D/g, '')) || 0
    return monthlyIncome || 0
  }, [baseSource, customBase, monthlyIncome, totalWalletBalance])
  
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

  // 50/30/20 zone data
  const zoneData = useMemo(() => {
    if (!baseAmount || baseAmount <= 0) return null
    const totalPct = zonePcts.needs + zonePcts.wants + zonePcts.savings

    return FIFTY_THIRTY_ZONES.map((zone) => {
      const pct = zonePcts[zone.id as keyof typeof zonePcts] || zone.defaultPct
      const allocated = Math.round((baseAmount * pct) / 100)
      const zoneCategories = zone.categories
        .map((catId) => BUILTIN_CATEGORIES[catId])
        .filter(Boolean)
      const spent = currentMonthTx
        .filter((t) => t.type === 'expense' && zone.categories.includes(t.category))
        .reduce((s, t) => s + t.amount, 0)
      const remaining = allocated - spent
      const pctUsed = allocated > 0 ? Math.round((spent / allocated) * 100) : 0
      const isOver = spent > allocated

      // Distribute allocated evenly among zone categories
      const perCat = zoneCategories.length > 0 ? Math.round(allocated / zoneCategories.length) : 0

      return {
        ...zone,
        pct,
        allocated,
        spent,
        remaining,
        pctUsed,
        isOver,
        zoneCategories,
        perCat,
        totalPct,
      }
    })
  }, [baseAmount, zonePcts, currentMonthTx])

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

  function apply5030() {
    if (!baseAmount || baseAmount <= 0) return
    for (const zone of FIFTY_THIRTY_ZONES) {
      const pct = zonePcts[zone.id as keyof typeof zonePcts] || zone.defaultPct
      const zoneBudget = Math.round((baseAmount * pct) / 100)
      const perCat = zone.categories.length > 0 ? Math.round(zoneBudget / zone.categories.length) : 0
      for (const catId of zone.categories) {
        setBudget(catId, perCat)
      }
    }
  }

  return (
    <div className={embedded ? 'flex flex-col gap-4' : 'flex flex-col gap-4 max-h-[65vh] overflow-y-auto'}>
      {/* Budget Total Summary */}
      {(() => {
        const totalBudget = EXPENSE_CATEGORIES.reduce((s, c) => s + (budgets[c.id] || 0), 0)
        const income = monthlyIncome || 0
        const pct = income > 0 ? Math.round((totalBudget / income) * 100) : 0
        const over = totalBudget > income && income > 0
        const healthy = pct > 0 && pct <= 100
        return (
          <div className={cn(
            'rounded-2xl p-4 text-white shadow-lg',
            over ? 'bg-gradient-to-br from-rose-500 to-red-600'
                 : healthy ? 'bg-gradient-to-br from-primary to-emerald-600'
                 : 'bg-gradient-to-br from-slate-500 to-slate-600',
          )}>
            <p className="text-xs font-semibold opacity-90">Total Budget Bulan Ini</p>
            <p className="mt-1 font-heading text-2xl font-extrabold tabular-nums">{formatIDR(totalBudget)}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] opacity-90">
              <span>Pemasukan {income > 0 ? formatIDR(income) : '—'}</span>
              <span className="font-semibold">
                {totalBudget === 0 ? 'Belum diatur'
                  : over ? `Over ${pct - 100}%`
                  : `${pct}% dari pemasukan`}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            {totalBudget > 0 && (
              <p className="mt-2 text-[10px] opacity-90">
                {over ? '⚠️ Budget melebihi pemasukan — kurangi beberapa kategori.'
                     : healthy ? '✅ Budget sehat, dalam batas pemasukan.'
                     : 'Atur budget untuk mulai melacak.'}
              </p>
            )}
          </div>
        )
      })()}

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'templates' as const, label: 'Template', emoji: '📋' },
          { id: 'auto' as const, label: 'Auto Budget', emoji: '🤖' },
          { id: 'rollover' as const, label: 'Rollover', emoji: '🔄' },
          { id: '5030' as const, label: '50/30/20', emoji: '🎯' },
          { id: 'manual' as const, label: 'Manual', emoji: '✏️' },
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

      {/* 50/30/20 Tab */}
      {activeTab === '5030' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-3"
        >
          {/* Header */}
          <div className="clay-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="size-4 text-primary" />
              <p className="text-sm font-semibold">Aturan 50/30/20</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Atur pengeluaranmu berdasarkan aturan 50/30/20: Kebutuhan, Keinginan, dan Tabungan.
            </p>
            
            {/* Base Amount Source Picker */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hitung Dari</p>
              <div className="flex gap-1.5">
                {[
                  { id: 'income' as const, label: 'Pendapatan', emoji: '💰', value: monthlyIncome },
                  { id: 'balance' as const, label: 'Total Saldo', emoji: '🏦', value: totalWalletBalance },
                  { id: 'custom' as const, label: 'Kustom', emoji: '✏️', value: null },
                ].map((src) => (
                  <button
                    key={src.id}
                    onClick={() => setBaseSource(src.id)}
                    className={cn(
                      'flex-1 rounded-lg px-2 py-1.5 text-center transition text-[10px]',
                      baseSource === src.id
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    <span className="block text-sm">{src.emoji}</span>
                    <span className="block mt-0.5">{src.label}</span>
                    {src.value != null && src.value > 0 && (
                      <span className="block mt-0.5 text-[9px] opacity-80">{formatIDR(src.value)}</span>
                    )}
                  </button>
                ))}
              </div>
              
              {baseSource === 'custom' && (
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Masukkan nominal..."
                  value={customBase}
                  onChange={(e) => setCustomBase(e.target.value)}
                  className="h-8 text-xs"
                />
              )}
              
              {baseAmount > 0 && (
                <div className="flex items-center justify-between mt-1 p-2 rounded-lg bg-primary/5">
                  <span className="text-[10px] text-muted-foreground">Dasar perhitungan</span>
                  <span className="text-sm font-bold text-primary">{formatIDR(baseAmount)}</span>
                </div>
              )}
            </div>
            
            {!baseAmount || baseAmount <= 0 ? (
              <p className="text-xs text-orange-500 mt-2">
                ⚠️ Pilih sumber dana atau isi nominal untuk menghitung budget.
              </p>
            ) : null}
          </div>

          {/* Percentage Sliders */}
          <div className="clay-card p-3">
            <p className="text-xs font-semibold mb-3">Kustom Persentase</p>
            <div className="flex flex-col gap-3">
              {FIFTY_THIRTY_ZONES.map((zone) => {
                const pct = zonePcts[zone.id as keyof typeof zonePcts]
                return (
                  <div key={zone.id} className="flex items-center gap-2">
                    <span className="text-xs w-20">{zone.emoji} {zone.label}</span>
                    <div className="relative flex-1">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={pct}
                        onChange={(e) => {
                          setZonePcts((prev) => ({ ...prev, [zone.id]: Number(e.target.value) }))
                        }}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${zone.color} 0%, ${zone.color} ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-10 text-right" style={{ color: zone.color }}>
                      {pct}%
                    </span>
                    {baseAmount > 0 && (
                      <span className="text-[10px] text-muted-foreground w-16 text-right">
                        {formatIDR(Math.round(baseAmount * pct / 100))}
                      </span>
                    )}
                  </div>
                )
              })}
              <div className="flex items-center justify-between mt-1">
                <span className={cn(
                  'text-[10px]',
                  (zonePcts.needs + zonePcts.wants + zonePcts.savings) === 100
                    ? 'text-green-500'
                    : 'text-orange-500'
                )}>
                  Total: {zonePcts.needs + zonePcts.wants + zonePcts.savings}%
                  {(zonePcts.needs + zonePcts.wants + zonePcts.savings) !== 100 && ' (harus 100%)'}
                </span>
                <button
                  onClick={() => setZonePcts({ needs: 50, wants: 30, savings: 20 })}
                  className="text-[10px] text-primary underline"
                >
                  Reset 50/30/20
                </button>
              </div>
            </div>
          </div>

          {/* Visual Bar Breakdown */}
          {baseAmount > 0 && zoneData && (
            <div className="clay-card p-3">
              <p className="text-xs font-semibold mb-2">Alokasi Bulanan</p>
              {/* Stacked bar */}
              <div className="flex h-5 rounded-full overflow-hidden mb-3">
                {zoneData.map((zone) => (
                  <motion.div
                    key={zone.id}
                    initial={{ width: 0 }}
                    animate={{ width: `${zone.pct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="flex items-center justify-center"
                    style={{ backgroundColor: zone.color }}
                  >
                    {zone.pct >= 15 && (
                      <span className="text-[9px] text-white font-medium">{zone.pct}%</span>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Zone summary cards */}
              <div className="flex gap-2">
                {zoneData.map((zone) => (
                  <motion.div
                    key={zone.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="flex-1 rounded-xl p-2 text-center"
                    style={{ backgroundColor: `${zone.color}15` }}
                  >
                    <span className="text-lg">{zone.emoji}</span>
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: zone.color }}>
                      {zone.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatIDR(zone.allocated)}</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(zone.pctUsed, 100)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: zone.isOver ? '#EF4444' : zone.color }}
                      />
                    </div>
                    <p className="text-[9px] mt-0.5" style={{ color: zone.isOver ? '#EF4444' : zone.color }}>
                      {zone.pctUsed}% terpakai
                    </p>
                    {zone.isOver && (
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <ShieldAlert className="size-2.5 text-red-500" />
                        <span className="text-[9px] text-red-500 font-medium">Over!</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Per-category breakdown */}
          {zoneData && baseAmount > 0 && (
            <div className="flex flex-col gap-2.5">
              {zoneData.map((zone) => (
                <motion.div
                  key={zone.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="clay-card p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>{zone.emoji}</span>
                    <p className="text-xs font-semibold flex-1">{zone.label} ({zone.pct}%)</p>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">
                        {formatIDR(zone.spent)} / {formatIDR(zone.allocated)}
                      </p>
                      {zone.isOver ? (
                        <p className="text-[10px] text-red-500 font-medium">
                          Over {formatIDR(Math.abs(zone.remaining))}
                        </p>
                      ) : (
                        <p className="text-[10px] text-green-500 font-medium">
                          Sisa {formatIDR(zone.remaining)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Zone progress bar */}
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-2.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(zone.pctUsed, 100)}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: zone.isOver ? '#EF4444' : zone.color }}
                    />
                  </div>

                  {/* Per-category rows */}
                  <div className="flex flex-col gap-1.5">
                    {zone.zoneCategories.map((cat) => {
                      const catSpent = currentMonthTx
                        .filter((t) => t.type === 'expense' && t.category === cat.id)
                        .reduce((s, t) => s + t.amount, 0)
                      const targetBudget = zone.perCat
                      const catPct = targetBudget > 0 ? Math.round((catSpent / targetBudget) * 100) : 0
                      const catOver = catSpent > targetBudget
                      return (
                        <div key={cat.id} className="flex items-center gap-2">
                          <span className="text-xs">
                            {cat.icon && <cat.icon className="size-3" style={{ color: cat.color }} />}
                          </span>
                          <span className="flex-1 text-[11px]">{cat.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatIDR(catSpent)} / {formatIDR(targetBudget)}
                          </span>
                          <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(catPct, 100)}%`,
                                backgroundColor: catOver ? '#EF4444' : cat.color,
                              }}
                            />
                          </div>
                          {catOver && (
                            <AlertTriangle className="size-3 text-red-500 shrink-0" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Apply button */}
          <Button
            onClick={apply5030}
            disabled={!baseAmount || baseAmount <= 0 || (zonePcts.needs + zonePcts.wants + zonePcts.savings) !== 100}
            className="gap-2"
          >
            <Target className="size-4" />
            Terapkan {zonePcts.needs}/{zonePcts.wants}/{zonePcts.savings}
          </Button>

          {/* Tips */}
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tips 50/30/20:</strong> Aturan ini adalah panduan fleksibel. Sesuaikan persentase
              sesuai kondisi keuanganmu. Yang penting adalah punya pola pengeluaran yang sadar dan terukur.
            </p>
          </div>
        </motion.div>
      )}

      {/* Manual Tab */}
      {activeTab === 'manual' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Atur budget manual per kategori. Kosongkan atau 0 untuk menghapus.
          </p>
          <div className="flex flex-col gap-2">
            {EXPENSE_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const current = budgets[cat.id] || 0
              const draft = manualDrafts[cat.id] ?? (current > 0 ? String(current) : '')
              return (
                <div key={cat.id} className="clay-card flex items-center gap-2 p-3">
                  {Icon && <Icon className="size-4 shrink-0" style={{ color: cat.color }} />}
                  <span className="flex-1 text-xs font-medium">{cat.label}</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={draft}
                    onChange={(e) => setManualDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                    className="h-8 w-28 text-right text-xs tabular-nums"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5"
                    onClick={() => {
                      const val = Number((draft || '').replace(/\D/g, '')) || 0
                      setBudget(cat.id, val)
                      setManualDrafts((d) => ({ ...d, [cat.id]: val > 0 ? String(val) : '' }))
                    }}
                  >
                    Simpan
                  </Button>
                  {current > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-destructive"
                      onClick={() => {
                        setBudget(cat.id, 0)
                        setManualDrafts((d) => ({ ...d, [cat.id]: '' }))
                      }}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!embedded && <Button variant="secondary" onClick={onClose}>Tutup</Button>}
    </div>
  )
}

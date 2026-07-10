'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  FileText,
  Sparkles,
  TrendingUp,
  Wallet,
  Search,
  X,
  ArrowUpDown,
  CalendarDays,
  DollarSign,
  Filter,
  Tag,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FinwiseProvider, useFinwise } from '@/components/finwise-store'
import { SpendingDonut } from '@/components/finwise/spending-donut'
import { TransactionRow } from '@/components/finwise/transaction-row'
import {
  formatIDR,
  formatIDRShort,
  summarize,
  spendingByCategory,
  CATEGORIES,
  type Transaction,
  type TxType,
} from '@/lib/finwise'
import { cn } from '@/lib/utils'

type Period = 'minggu' | 'bulan' | 'tahun'

function ReportsContent() {
  const { transactions, allCategories } = useFinwise()
  const [period, setPeriod] = useState<Period>('bulan')
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all')

  const periodLabels: Record<Period, string> = {
    minggu: 'Minggu Ini',
    bulan: 'Bulan Ini',
    tahun: 'Tahun Ini',
  }

  const filtered = useMemo(() => {
    const now = new Date()
    return transactions.filter((t) => {
      const d = new Date(t.date)
      if (period === 'minggu') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo
      }
      if (period === 'bulan') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
      return d.getFullYear() === now.getFullYear()
    })
  }, [transactions, period])

  // ─── Transaction filters (full) ───
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'all' | 'this_week' | 'this_month' | 'last_month' | 'custom'>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [amountPreset, setAmountPreset] = useState<'all' | 'under_100k' | '100k_500k' | 'over_500k'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Used tags
  const usedTags = useMemo(() => {
    const s = new Set<string>()
    filtered.forEach((t) => t.tags?.forEach((tag) => s.add(tag)))
    return Array.from(s).sort()
  }, [filtered])

  // Categories actually used (by frequency)
  const usedCategories = useMemo(() => {
    const m = new Map<string, number>()
    filtered.forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + 1))
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([id]) => id)
  }, [filtered])

  // Fuzzy match
  const fuzzyMatch = (q: string, text: string) => {
    const qq = q.toLowerCase().trim()
    const tt = text.toLowerCase()
    if (tt.includes(qq)) return true
    let qi = 0
    for (let ti = 0; ti < tt.length && qi < qq.length; ti++) if (tt[ti] === qq[qi]) qi++
    return qi === qq.length
  }

  const getDateBounds = () => {
    const today = new Date().toISOString().slice(0, 10)
    if (dateRange === 'this_week') {
      const d = new Date()
      const day = d.getDay()
      const diff = day === 0 ? 6 : day - 1
      d.setDate(d.getDate() - diff)
      return { from: d.toISOString().slice(0, 10), to: today }
    }
    if (dateRange === 'this_month') {
      const d = new Date()
      return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, to: today }
    }
    if (dateRange === 'last_month') {
      const d = new Date()
      d.setMonth(d.getMonth() - 1, 1)
      const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
      return { from, to: last }
    }
    if (dateRange === 'custom') return { from: customFrom || null, to: customTo || null }
    return { from: null, to: null }
  }

  const amountBounds = () => {
    switch (amountPreset) {
      case 'under_100k': return { min: null as number | null, max: 100_000 }
      case '100k_500k': return { min: 100_000, max: 500_000 }
      case 'over_500k': return { min: 500_000, max: null as number | null }
      default: return { min: null as number | null, max: null as number | null }
    }
  }

  const { from: dateFrom, to: dateTo } = getDateBounds()
  const { min: amtMin, max: amtMax } = amountBounds()

  const activeFilterCount = useMemo(() => {
    let c = 0
    if (txFilter !== 'all') c++
    if (dateRange !== 'all') c++
    if (selectedCategory !== 'all') c++
    if (amountPreset !== 'all') c++
    if (sortBy !== 'newest') c++
    if (selectedTag) c++
    return c
  }, [txFilter, dateRange, selectedCategory, amountPreset, sortBy, selectedTag])

  const txList = useMemo(() => {
    const result = filtered.filter((t: Transaction) => {
      if (txFilter !== 'all' && t.type !== txFilter) return false
      if (selectedTag && (!t.tags || !t.tags.includes(selectedTag))) return false
      if (query) {
        const catLabel = CATEGORIES[t.category]?.label ?? ''
        const ok = fuzzyMatch(query, t.description) || fuzzyMatch(query, catLabel) ||
          (t.tags && t.tags.some((tag) => fuzzyMatch(query, tag)))
        if (!ok) return false
      }
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false
      if (dateFrom && t.date.slice(0, 10) < dateFrom) return false
      if (dateTo && t.date.slice(0, 10) > dateTo) return false
      if (amtMin !== null && t.amount < amtMin) return false
      if (amtMax !== null && t.amount > amtMax) return false
      return true
    })
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.date.localeCompare(a.date)
        case 'oldest': return a.date.localeCompare(b.date)
        case 'highest': return b.amount - a.amount
        case 'lowest': return a.amount - b.amount
      }
    })
    return result
  }, [filtered, txFilter, selectedTag, query, selectedCategory, dateFrom, dateTo, amtMin, amtMax, sortBy])

  const clearAllFilters = () => {
    setTxFilter('all')
    setQuery('')
    setSelectedTag(null)
    setDateRange('all')
    setCustomFrom('')
    setCustomTo('')
    setSelectedCategory('all')
    setAmountPreset('all')
    setSortBy('newest')
  }

  const { income, expense, surplus } = summarize(filtered)
  const byCat = spendingByCategory(filtered, allCategories)
  const positive = surplus >= 0

  const topCategory = byCat[0]
  const transactionCount = filtered.length

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-accent" /> FinWise AI
            </p>
            <h1 className="font-heading text-xl font-bold">Laporan Keuangan</h1>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Download className="size-3.5" />
          Export
        </Button>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2">
        {(['minggu', 'bulan', 'tahun'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium capitalize transition',
              period === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            {p === 'minggu' ? 'Minggu' : p === 'bulan' ? 'Bulan' : 'Tahun'}
          </button>
        ))}
      </div>

      {/* Period Label */}
      <p className="text-sm text-muted-foreground">{periodLabels[period]}</p>

      {/* Summary Card */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-card to-surface-2 neon-glow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="size-4" />
              Ringkasan {periodLabels[period]}
            </div>
            <span
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                positive
                  ? 'bg-success/15 text-success'
                  : 'bg-destructive/15 text-destructive',
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {positive ? 'Surplus' : 'Defisit'}
            </span>
          </div>
          <p className="mt-2 font-heading text-3xl font-bold tabular-nums">
            {formatIDR(surplus)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background/40 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="size-3 text-success" /> Pemasukan
              </p>
              <p className="mt-1 font-semibold tabular-nums text-success">
                {formatIDR(income)}
              </p>
            </div>
            <div className="rounded-xl bg-background/40 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowDownRight className="size-3 text-destructive" /> Pengeluaran
              </p>
              <p className="mt-1 font-semibold tabular-nums">
                {formatIDR(expense)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transaksi</p>
              <p className="font-heading text-lg font-bold tabular-nums">
                {transactionCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: topCategory
                  ? `color-mix(in oklch, ${topCategory.category.color} 15%, transparent)`
                  : 'oklch(0.27 0.03 285)',
              }}
            >
              <BarChart3
                className="size-5"
                style={{ color: topCategory?.category.color ?? 'oklch(0.7 0.18 295)' }}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kategori Terbesar</p>
              <p className="text-sm font-semibold truncate">
                {topCategory?.category.label ?? '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Donut */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <TrendingUp className="size-4 text-primary" />
            Breakdown per Kategori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SpendingDonut data={byCat} total={expense} />
          <ul className="mt-4 flex flex-col gap-2">
            {byCat.map(({ category, value }) => {
              const pct = expense > 0 ? Math.round((value / expense) * 100) : 0
              return (
                <li
                  key={category.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary/60"
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{category.label}</p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatIDRShort(value)}
                    </p>
                    <p className="text-xs text-muted-foreground">{pct}%</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      {/* ─── Transactions List (merged from old Transaksi tab) ─── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <FileText className="size-4 text-primary" /> Transaksi
            {txList.length !== filtered.length && (
              <span className="text-[10px] font-semibold text-muted-foreground">
                {txList.length}/{filtered.length}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-1.5">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive transition hover:bg-destructive/20"
              >
                <RotateCcw className="size-3" /> Reset
              </button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5">
              <Download className="size-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari deskripsi, kategori, atau tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9 bg-card"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Type filter chips + Advanced toggle + Sort */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {([
              { id: 'all', label: 'Semua' },
              { id: 'income', label: 'Pemasukan' },
              { id: 'expense', label: 'Pengeluaran' },
            ] as const).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTxFilter(f.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition',
                  txFilter === f.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition',
                showAdvanced || activeFilterCount > 0
                  ? 'bg-primary/15 text-primary'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger size="sm" className="gap-1.5">
                <ArrowUpDown className="size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Terbaru</SelectItem>
                <SelectItem value="oldest">Terlama</SelectItem>
                <SelectItem value="highest">Nominal Terbesar</SelectItem>
                <SelectItem value="lowest">Nominal Terkecil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced filters (collapsible) */}
        {showAdvanced && (
          <div className="flex flex-col gap-3 rounded-2xl bg-secondary/40 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Date range */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">Waktu</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {([
                  { id: 'all', label: 'Semua' },
                  { id: 'this_week', label: 'Minggu Ini' },
                  { id: 'this_month', label: 'Bulan Ini' },
                  { id: 'last_month', label: 'Bulan Lalu' },
                  { id: 'custom', label: 'Kustom' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDateRange(opt.id)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition',
                      dateRange === opt.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {dateRange === 'custom' && (
                <div className="flex gap-2 pt-1">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Dari</label>
                    <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground">Sampai</label>
                    <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">Kategori</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition',
                    selectedCategory === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  Semua
                </button>
                {usedCategories.map((catId) => {
                  const cat = allCategories[catId] ?? CATEGORIES[catId]
                  const label = cat?.label ?? catId
                  return (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => setSelectedCategory(selectedCategory === catId ? 'all' : catId)}
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition',
                        selectedCategory === catId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">Nominal</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {([
                  { id: 'all', label: 'Semua' },
                  { id: 'under_100k', label: '< 100rb' },
                  { id: '100k_500k', label: '100rb–500rb' },
                  { id: 'over_500k', label: '> 500rb' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAmountPreset(opt.id)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition',
                      amountPreset === opt.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            {usedTags.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Tag className="size-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">Tag</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {usedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium transition',
                        selectedTag === tag
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {txList.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {filtered.length === 0
                ? 'Belum ada transaksi di periode ini.'
                : 'Tidak ada transaksi cocok dengan filter.'}
            </p>
          </div>
        ) : (
          <div className="-mx-2 flex flex-col">
            {txList.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>

      {/* Export placeholder */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <Download className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Export Laporan PDF</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Unduh laporan keuangan {periodLabels[period].toLowerCase()} dalam format PDF.
            </p>
          </div>
          <Button variant="outline" className="gap-1.5">
            <Download className="size-4" />
            Download PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-6">
      <FinwiseProvider>
        <ReportsContent />
      </FinwiseProvider>
    </div>
  )
}

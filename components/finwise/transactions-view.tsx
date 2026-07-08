'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Tag,
  X,
  ArrowUpDown,
  CalendarDays,
  DollarSign,
  Filter,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TransactionRow } from './transaction-row'
import { EditTransactionForm } from './edit-transaction-form'
import { BottomSheet } from './bottom-sheet'
import { useFinwise } from '@/components/finwise-store'
import { CATEGORIES, type Transaction, type TxType } from '@/lib/finwise'
import { cn } from '@/lib/utils'
import { StaggerList, StaggerItem } from './stagger-list'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ───
type Filter = 'all' | TxType
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest'
type DateRange = 'all' | 'this_week' | 'this_month' | 'last_month' | 'custom'
type AmountPreset = 'all' | 'under_100k' | '100k_500k' | 'over_500k'

// ─── Date helpers ───
function getMonthStart(offset = 0): string {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  return d.toISOString().slice(0, 10)
}

function getMonthEnd(offset = 0): string {
  const d = new Date()
  d.setMonth(d.getMonth() + offset + 1, 0)
  return d.toISOString().slice(0, 10)
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday as start
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Fuzzy match (subsequence scoring) ───
function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase().trim()
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  // Subsequence match
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

// ─── Amount range helpers ───
function getAmountBounds(preset: AmountPreset): { min: number | null; max: number | null } {
  switch (preset) {
    case 'under_100k': return { min: null, max: 100_000 }
    case '100k_500k': return { min: 100_000, max: 500_000 }
    case 'over_500k': return { min: 500_000, max: null }
    default: return { min: null, max: null }
  }
}

// ─── Chip component ───
function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-medium transition whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-secondary text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {children}
    </motion.button>
  )
}

// ─── Main Component ───
export function TransactionsView() {
  const { transactions, deleteTransaction, tags: savedTags, hideBalance, allCategories } = useFinwise()
  const searchRef = useRef<HTMLInputElement>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // Core filter state
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  // Advanced filter state
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [amountPreset, setAmountPreset] = useState<AmountPreset>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  // Auto-focus search on mount
  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  // Count active advanced filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filter !== 'all') count++
    if (dateRange !== 'all') count++
    if (selectedCategory !== 'all') count++
    if (amountPreset !== 'all') count++
    if (sortBy !== 'newest') count++
    if (selectedTag) count++
    return count
  }, [filter, dateRange, selectedCategory, amountPreset, sortBy, selectedTag])

  // Get tags actually used in transactions
  const usedTags = useMemo(() => {
    const tagSet = new Set<string>()
    transactions.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [transactions])

  // Get unique categories used in transactions (sorted by frequency)
  const usedCategories = useMemo(() => {
    const catMap = new Map<string, number>()
    transactions.forEach((t) => catMap.set(t.category, (catMap.get(t.category) ?? 0) + 1))
    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
  }, [transactions])

  const filtered = useMemo(() => {
    // Date range boundaries
    let dateFrom: string | null = null
    let dateTo: string | null = null
    if (dateRange === 'this_week') {
      dateFrom = getWeekStart()
      dateTo = getToday()
    } else if (dateRange === 'this_month') {
      dateFrom = getMonthStart(0)
      dateTo = getMonthEnd(0)
    } else if (dateRange === 'last_month') {
      dateFrom = getMonthStart(-1)
      dateTo = getMonthEnd(-1)
    } else if (dateRange === 'custom') {
      dateFrom = customDateFrom || null
      dateTo = customDateTo || null
    }

    // Amount range from preset
    const { min: presetMin, max: presetMax } = getAmountBounds(amountPreset)

    const result = transactions.filter((t: Transaction) => {
      // Type filter
      if (filter !== 'all' && t.type !== filter) return false

      // Tag filter
      if (selectedTag && (!t.tags || !t.tags.includes(selectedTag))) return false

      // Search query (fuzzy match on description and category label)
      if (query) {
        const catLabel = CATEGORIES[t.category]?.label ?? ''
        const matchesSearch =
          fuzzyMatch(query, t.description) ||
          fuzzyMatch(query, catLabel) ||
          (t.tags && t.tags.some((tag) => fuzzyMatch(query, tag)))
        if (!matchesSearch) return false
      }

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory)
        return false

      // Date range filter
      if (dateFrom && t.date.slice(0, 10) < dateFrom) return false
      if (dateTo && t.date.slice(0, 10) > dateTo) return false

      // Amount range filter
      if (presetMin !== null && t.amount < presetMin) return false
      if (presetMax !== null && t.amount > presetMax) return false

      return true
    })

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.date.localeCompare(a.date)
        case 'oldest':
          return a.date.localeCompare(b.date)
        case 'highest':
          return b.amount - a.amount
        case 'lowest':
          return a.amount - b.amount
        default:
          return 0
      }
    })

    return result
  }, [
    transactions,
    filter,
    query,
    selectedTag,
    dateRange,
    customDateFrom,
    customDateTo,
    selectedCategory,
    amountPreset,
    sortBy,
  ])

  const clearAllFilters = () => {
    setFilter('all')
    setQuery('')
    setSelectedTag(null)
    setDateRange('all')
    setCustomDateFrom('')
    setCustomDateTo('')
    setSelectedCategory('all')
    setAmountPreset('all')
    setSortBy('newest')
  }

  const hasActiveFilters = activeFilterCount > 0 || query || selectedTag

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'expense', label: 'Pengeluaran' },
    { id: 'income', label: 'Pemasukan' },
  ]

  const dateRangeOptions: { id: DateRange; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'this_week', label: 'Minggu Ini' },
    { id: 'this_month', label: 'Bulan Ini' },
    { id: 'last_month', label: 'Bulan Lalu' },
    { id: 'custom', label: 'Kustom' },
  ]

  const amountOptions: { id: AmountPreset; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'under_100k', label: '< 100rb' },
    { id: '100k_500k', label: '100rb – 500rb' },
    { id: 'over_500k', label: '> 500rb' },
  ]

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ─── Search bar ─── */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Cari transaksi, kategori, atau tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9 bg-card"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            >
              <X className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Type filter pills + Sort ─── */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>

        <div className="ml-auto">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
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
      </motion.div>

      {/* ─── Date range chips ─── */}
      <motion.div
        className="flex flex-col gap-1.5"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-medium text-muted-foreground">Waktu</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {dateRangeOptions.map((opt) => (
            <Chip
              key={opt.id}
              active={dateRange === opt.id}
              onClick={() => setDateRange(opt.id)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>

        {/* Custom date inputs */}
        <AnimatePresence>
          {dateRange === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 pt-1">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">Dari</label>
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">Sampai</label>
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Category chips (horizontal scroll) ─── */}
      <motion.div
        className="flex flex-col gap-1.5"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center gap-1.5">
          <Filter className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-medium text-muted-foreground">Kategori</span>
        </div>
        <div
          ref={categoryScrollRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5"
        >
          <Chip
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          >
            Semua
          </Chip>
          {usedCategories.map((catId) => {
            const cat = allCategories[catId] ?? CATEGORIES[catId]
            const label = cat?.label ?? catId
            return (
              <Chip
                key={catId}
                active={selectedCategory === catId}
                onClick={() =>
                  setSelectedCategory(selectedCategory === catId ? 'all' : catId)
                }
              >
                {label}
              </Chip>
            )
          })}
        </div>
      </motion.div>

      {/* ─── Amount range chips ─── */}
      <motion.div
        className="flex flex-col gap-1.5"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <div className="flex items-center gap-1.5">
          <DollarSign className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] font-medium text-muted-foreground">Nominal</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {amountOptions.map((opt) => (
            <Chip
              key={opt.id}
              active={amountPreset === opt.id}
              onClick={() => setAmountPreset(opt.id)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </motion.div>

      {/* ─── Tag filter chips ─── */}
      <AnimatePresence>
        {usedTags.length > 0 && (
          <motion.div
            className="flex gap-1.5 flex-wrap"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Tag className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
            {usedTags.map((tag) => (
              <motion.button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                whileTap={{ scale: 0.93 }}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium transition',
                  selectedTag === tag
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/10 text-primary hover:bg-primary/20',
                )}
              >
                #{tag}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Results count + Clear all ─── */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
              dari {transactions.length} transaksi
            </p>
            <motion.button
              type="button"
              onClick={clearAllFilters}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 font-medium transition"
            >
              <RotateCcw className="size-3" />
              Hapus Semua
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Swipe hint ─── */}
      <p className="text-[11px] text-muted-foreground text-center">
        ← Geser kiri untuk hapus · Geser kanan untuk edit →
      </p>

      {/* ─── Transaction list ─── */}
      <Card>
        <CardContent className="p-2">
          {filtered.length === 0 ? (
            <motion.div
              className="py-10 flex flex-col items-center gap-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Search className="size-8 text-muted-foreground/40" />
              <p className="text-center text-sm text-muted-foreground">
                Tidak ada transaksi yang cocok.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Hapus semua filter
                </button>
              )}
            </motion.div>
          ) : (
            <StaggerList className="flex flex-col">
              {filtered.map((tx) => (
                <StaggerItem key={tx.id}>
                  <TransactionRow
                    tx={tx}
                    onDelete={deleteTransaction}
                    onEdit={setEditingTx}
                    hideBalance={hideBalance}
                  />
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </CardContent>
      </Card>

      {/* ─── Edit transaction bottom sheet ─── */}
      <BottomSheet
        open={!!editingTx}
        onClose={() => setEditingTx(null)}
        title="Edit Transaksi"
      >
        {editingTx && (
          <EditTransactionForm
            transaction={editingTx}
            onDone={() => setEditingTx(null)}
          />
        )}
      </BottomSheet>
    </motion.div>
  )
}

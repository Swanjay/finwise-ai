'use client'

import { useMemo, useState } from 'react'
import {
  Search,
  Tag,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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

type Filter = 'all' | TxType
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest'
type DateRange = 'all' | 'this_month' | 'last_month' | 'custom'

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

export function TransactionsView() {
  const { transactions, deleteTransaction, tags: savedTags, hideBalance } = useFinwise()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Advanced filter state
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  // Count active advanced filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (dateRange !== 'all') count++
    if (selectedCategory !== 'all') count++
    if (amountMin || amountMax) count++
    if (sortBy !== 'newest') count++
    return count
  }, [dateRange, selectedCategory, amountMin, amountMax, sortBy])

  // Get tags actually used in transactions
  const usedTags = useMemo(() => {
    const tagSet = new Set<string>()
    transactions.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [transactions])

  // Get unique categories used in transactions
  const usedCategories = useMemo(() => {
    const catSet = new Set<string>()
    transactions.forEach((t) => catSet.add(t.category))
    return Array.from(catSet).sort()
  }, [transactions])

  const filtered = useMemo(() => {
    // Date range boundaries
    let dateFrom: string | null = null
    let dateTo: string | null = null
    if (dateRange === 'this_month') {
      dateFrom = getMonthStart(0)
      dateTo = getMonthEnd(0)
    } else if (dateRange === 'last_month') {
      dateFrom = getMonthStart(-1)
      dateTo = getMonthEnd(-1)
    } else if (dateRange === 'custom') {
      dateFrom = customDateFrom || null
      dateTo = customDateTo || null
    }

    const minAmt = amountMin ? parseFloat(amountMin) : null
    const maxAmt = amountMax ? parseFloat(amountMax) : null

    const result = transactions.filter((t: Transaction) => {
      // Type filter
      if (filter !== 'all' && t.type !== filter) return false

      // Tag filter
      if (selectedTag && (!t.tags || !t.tags.includes(selectedTag))) return false

      // Search query
      if (query) {
        const q = query.toLowerCase()
        const matchesSearch =
          t.description.toLowerCase().includes(q) ||
          CATEGORIES[t.category]?.label.toLowerCase().includes(q) ||
          (t.tags && t.tags.some((tag) => tag.includes(q)))
        if (!matchesSearch) return false
      }

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory)
        return false

      // Date range filter
      if (dateFrom && t.date.slice(0, 10) < dateFrom) return false
      if (dateTo && t.date.slice(0, 10) > dateTo) return false

      // Amount range filter
      if (minAmt !== null && t.amount < minAmt) return false
      if (maxAmt !== null && t.amount > maxAmt) return false

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
    amountMin,
    amountMax,
    sortBy,
  ])

  const clearAllAdvanced = () => {
    setDateRange('all')
    setCustomDateFrom('')
    setCustomDateTo('')
    setSelectedCategory('all')
    setAmountMin('')
    setAmountMax('')
    setSortBy('newest')
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'expense', label: 'Pengeluaran' },
    { id: 'income', label: 'Pemasukan' },
  ]

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Search bar */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari transaksi atau tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
          >
            <X className="size-4" />
          </button>
        )}
      </motion.div>

      {/* Type filter pills + Sort dropdown */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <motion.button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </motion.button>
          ))}
        </div>

        {/* Sort dropdown */}
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

      {/* Advanced filters toggle */}
      <motion.button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition self-start"
      >
        <SlidersHorizontal className="size-3.5" />
        <span>Filter Lanjutan</span>
        {activeFilterCount > 0 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
        {showAdvanced ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
      </motion.button>

      {/* Advanced filters panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <Card className="border-dashed">
              <CardContent className="p-3 flex flex-col gap-3">
                {/* Date range */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Rentang Waktu
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'Semua' },
                        { id: 'this_month', label: 'Bulan Ini' },
                        { id: 'last_month', label: 'Bulan Lalu' },
                        { id: 'custom', label: 'Kustom' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDateRange(opt.id)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-medium transition',
                          dateRange === opt.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {dateRange === 'custom' && (
                    <div className="flex gap-2 mt-1">
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
                  )}
                </div>

                {/* Category filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Kategori
                  </label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(v) => setSelectedCategory(v ?? 'all')}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {usedCategories.map((catId) => {
                        const cat = CATEGORIES[catId]
                        return (
                          <SelectItem key={catId} value={catId}>
                            {cat?.label ?? catId}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount range */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Rentang Nominal (Rp)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value)}
                      className="h-8 text-xs flex-1"
                      min={0}
                    />
                    <span className="flex items-center text-xs text-muted-foreground">—</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value)}
                      className="h-8 text-xs flex-1"
                      min={0}
                    />
                  </div>
                </div>

                {/* Clear all button */}
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllAdvanced}
                    className="self-start text-xs text-destructive hover:text-destructive"
                  >
                    <X className="size-3.5" />
                    Reset Filter
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag filter chips */}
      {usedTags.length > 0 && (
        <motion.div
          className="flex gap-1.5 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <Tag className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
          {selectedTag && (
            <motion.button
              type="button"
              onClick={() => setSelectedTag(null)}
              whileTap={{ scale: 0.93 }}
              className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/25 transition"
            >
              ✕ Hapus filter
            </motion.button>
          )}
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

      {/* Results summary */}
      {(query || activeFilterCount > 0 || selectedTag) && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} dari {transactions.length} transaksi
        </p>
      )}

      {/* Swipe hint */}
      <p className="text-[11px] text-muted-foreground text-center">
        ← Geser kiri untuk hapus · Geser kanan untuk edit →
      </p>

      {/* Transaction list with staggered animation */}
      <Card>
        <CardContent className="p-2">
          {filtered.length === 0 ? (
            <motion.p
              className="py-10 text-center text-sm text-muted-foreground"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              Tidak ada transaksi yang cocok.
            </motion.p>
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

      {/* Edit transaction bottom sheet */}
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

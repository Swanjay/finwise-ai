'use client'

import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Search,
  Plus,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { FinwiseProvider, useFinwise } from '@/components/finwise-store'
import { TransactionRow } from '@/components/finwise/transaction-row'
import {
  formatIDR,
  summarize,
  CATEGORIES,
  EXPENSE_CATEGORIES,
  type Transaction,
  type TxType,
  type CategoryId,
} from '@/lib/finwise'
import { cn } from '@/lib/utils'

type FilterType = 'all' | TxType

function ExpensesContent() {
  const { transactions, addTransaction, deleteTransaction, allCategories } = useFinwise()
  const [filter, setFilter] = useState<FilterType>('all')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [catFilter, setCatFilter] = useState<CategoryId | 'all'>('all')

  // Form state
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const filtered = useMemo(() => {
    return transactions.filter((t: Transaction) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          t.description.toLowerCase().includes(q) ||
          (allCategories[t.category]?.label ?? t.category).toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [transactions, filter, query, catFilter])

  const { income, expense, surplus } = useMemo(
    () => summarize(transactions),
    [transactions],
  )

  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'expense', label: 'Pengeluaran' },
    { id: 'income', label: 'Pemasukan' },
  ]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (Number(amount) <= 0) return
    addTransaction({
      type,
      category: type === 'income' ? 'income' : category,
      amount: Number(amount),
      description: description || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
      date,
    })
    setAmount('')
    setDescription('')
    setShowForm(false)
  }

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
            <h1 className="font-heading text-xl font-bold">Semua Transaksi</h1>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1"
        >
          <Plus className="size-4" />
          Baru
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Pemasukan</p>
          <p className="font-semibold text-xs tabular-nums text-success">
            {formatIDR(income)}
          </p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Pengeluaran</p>
          <p className="font-semibold text-xs tabular-nums">
            {formatIDR(expense)}
          </p>
        </div>
        <div className="rounded-xl bg-surface-2 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Surplus</p>
          <p
            className={cn(
              'font-semibold text-xs tabular-nums',
              surplus >= 0 ? 'text-success' : 'text-destructive',
            )}
          >
            {formatIDR(surplus)}
          </p>
        </div>
      </div>

      {/* Add Transaction Form (inline toggle) */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="font-heading text-base">Catat Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
                  <TabsTrigger value="income">Pemasukan</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-amount">Jumlah (Rp)</Label>
                <Input
                  id="exp-amount"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className="h-10 tabular-nums"
                />
              </div>

              {type === 'expense' && (
                <div className="flex flex-col gap-1.5">
                  <Label>Kategori</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EXPENSE_CATEGORIES.map((c) => {
                      const Icon = c.icon
                      const active = category === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(c.id)}
                          className={cn(
                            'flex flex-col items-center gap-0.5 rounded-lg border p-1.5 text-[10px] transition',
                            active
                              ? 'border-primary bg-primary/15 text-foreground'
                              : 'border-border text-muted-foreground hover:bg-secondary',
                          )}
                        >
                          <Icon className="size-3.5" />
                          <span className="truncate">{c.label.split(' ')[0]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-desc">Deskripsi</Label>
                <Input
                  id="exp-desc"
                  placeholder="Contoh: Makan siang"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-date">Tanggal</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={Number(amount) <= 0}
                  className="flex-1"
                >
                  Simpan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari transaksi…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition',
              filter === f.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Category filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setCatFilter('all')}
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
            catFilter === 'all'
              ? 'bg-accent text-accent-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground',
          )}
        >
          Semua Kategori
        </button>
        {EXPENSE_CATEGORIES.map((c) => {
          const Icon = c.icon
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatFilter(c.id)}
              className={cn(
                'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                catFilter === c.id
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3" />
              {c.label.split(' ')[0]}
            </button>
          )
        })}
      </div>

      {/* Transaction list */}
      <Card>
        <CardContent className="p-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tidak ada transaksi yang cocok.
            </p>
          ) : (
            <ul className="flex flex-col">
              {filtered.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  onDelete={deleteTransaction}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ExpensesPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-6">
      <FinwiseProvider>
        <ExpensesContent />
      </FinwiseProvider>
    </div>
  )
}

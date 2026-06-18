'use client'

import { useMemo, useState } from 'react'
import { Search, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TransactionRow } from './transaction-row'
import { useFinwise } from '@/components/finwise-store'
import { CATEGORIES, type Transaction, type TxType } from '@/lib/finwise'
import { cn } from '@/lib/utils'

type Filter = 'all' | TxType

export function TransactionsView() {
  const { transactions, deleteTransaction, tags: savedTags } = useFinwise()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Get tags actually used in transactions
  const usedTags = useMemo(() => {
    const tagSet = new Set<string>()
    transactions.forEach((t) => t.tags?.forEach((tag) => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter((t: Transaction) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (selectedTag && (!t.tags || !t.tags.includes(selectedTag))) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          t.description.toLowerCase().includes(q) ||
          CATEGORIES[t.category].label.toLowerCase().includes(q) ||
          (t.tags && t.tags.some((tag) => tag.includes(q)))
        )
      }
      return true
    })
  }, [transactions, filter, query, selectedTag])

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'expense', label: 'Pengeluaran' },
    { id: 'income', label: 'Pemasukan' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari transaksi atau tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2">
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

      {/* Tag filter chips */}
      {usedTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <Tag className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
          {selectedTag && (
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/25 transition"
            >
              ✕ Hapus filter
            </button>
          )}
          {usedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium transition',
                selectedTag === tag
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary hover:bg-primary/20',
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

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

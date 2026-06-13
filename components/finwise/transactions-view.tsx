'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TransactionRow } from './transaction-row'
import { useFinwise } from '@/components/finwise-store'
import { CATEGORIES, type Transaction, type TxType } from '@/lib/finwise'
import { cn } from '@/lib/utils'

type Filter = 'all' | TxType

export function TransactionsView() {
  const { transactions, deleteTransaction } = useFinwise()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    return transactions.filter((t: Transaction) => {
      if (filter !== 'all' && t.type !== filter) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          t.description.toLowerCase().includes(q) ||
          CATEGORIES[t.category].label.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [transactions, filter, query])

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
          placeholder="Cari transaksi…"
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

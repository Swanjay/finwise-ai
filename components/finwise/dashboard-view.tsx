'use client'

import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatIDR, spendingByCategory, summarize, type Transaction } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { SpendingDonut } from './spending-donut'
import { BudgetProgress } from './budget-progress'
import { TransactionRow } from './transaction-row'

export function DashboardView({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const { monthlyIncome, allCategories } = useFinwise()
  const { income, expense, surplus } = summarize(transactions)
  const byCat = spendingByCategory(transactions, allCategories)
  const positive = surplus >= 0

  const spentMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount)
  }

  const recent = transactions.slice(0, 5)

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-card to-surface-2 neon-glow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="size-4" />Surplus {month}</div>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${positive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
              {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {positive ? 'Sehat' : 'Defisit'}
            </span>
          </div>
          <p className="mt-2 font-heading text-3xl font-bold tabular-nums">{formatIDR(surplus)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-background/40 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowUpRight className="size-3 text-success" /> Pemasukan</p>
              <p className="mt-1 font-semibold tabular-nums text-success">{formatIDR(income)}</p>
            </div>
            <div className="rounded-xl bg-background/40 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowDownRight className="size-3 text-destructive" /> Pengeluaran</p>
              <p className="mt-1 font-semibold tabular-nums">{formatIDR(expense)}</p>
            </div>
          </div>
          {monthlyIncome > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Target pemasukan</span><span className="tabular-nums">{formatIDR(monthlyIncome)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {byCat.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-heading text-base">Pengeluaran per Kategori</CardTitle></CardHeader>
          <CardContent>
            <SpendingDonut data={byCat} total={expense} />
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {byCat.slice(0, 6).map(({ category, value }) => (
                <li key={category.id} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="truncate text-muted-foreground">{category.label}</span>
                  <span className="ml-auto tabular-nums">{formatIDR(value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 font-heading text-base"><TrendingUp className="size-4 text-primary" />Progres Anggaran</CardTitle></CardHeader>
        <CardContent><BudgetProgress spentByCat={spentMap} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading text-base">Transaksi Terakhir</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada transaksi — yuk catat yang pertama! 🚀</p>
          ) : (
            <ul className="-mx-2 flex flex-col">{recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

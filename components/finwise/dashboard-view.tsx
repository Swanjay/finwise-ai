'use client'

import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, Pencil, TrendingUp, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatIDR, spendingByCategory, summarize, type Transaction } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { SpendingDonut } from './spending-donut'
import { BudgetProgress } from './budget-progress'
import { TransactionRow } from './transaction-row'
import { EmptyState } from './mascot'

export function DashboardView({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const { monthlyIncome, allCategories, initialBalance, updateInitialBalance, hideBalance, toggleHideBalance } = useFinwise()
  const { income, expense, surplus } = summarize(transactions)
  const byCat = spendingByCategory(transactions, allCategories)
  const totalBalance = initialBalance + surplus
  const positive = totalBalance >= 0
  const [showInitInput, setShowInitInput] = useState(false)
  const [initInput, setInitInput] = useState('')

  const spentMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount)
  }

  const recent = transactions.slice(0, 5)

  function saveInitBalance() {
    const val = Number(initInput.replace(/\D/g, '')) || 0
    updateInitialBalance(val)
    setShowInitInput(false)
    setInitInput('')
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-card to-surface-2 neon-glow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="size-4" />Saldo {month}</div>
            <div className="flex items-center gap-2">
              <button onClick={toggleHideBalance} className="text-muted-foreground hover:text-foreground transition">
                {hideBalance ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${positive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {positive ? 'Sehat' : 'Defisit'}
              </span>
            </div>
          </div>
          <p className="mt-2 font-heading text-3xl font-bold tabular-nums">{hideBalance ? '••••••••' : formatIDR(totalBalance)}</p>
          {initialBalance > 0 && !hideBalance && (
            <p className="mt-1 text-xs text-muted-foreground">Saldo awal: {formatIDR(initialBalance)}</p>
          )}
          {!showInitInput ? (
            <button onClick={() => setShowInitInput(true)} className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline">
              <Pencil className="size-3" /> {initialBalance > 0 ? 'Ubah saldo awal' : 'Atur saldo awal'}
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <Input inputMode="numeric" placeholder="Masukkan saldo awal" value={initInput} onChange={(e) => setInitInput(e.target.value)} className="h-8 text-xs" />
              <Button size="sm" className="h-8 text-xs" onClick={saveInitBalance}>Simpan</Button>
            </div>
          )}
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
            <EmptyState 
              title="Belum ada transaksi"
              description="Yuk catat transaksi pertamamu! 🚀"
            />
          ) : (
            <ul className="-mx-2 flex flex-col">{recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, TrendingUp, Wallet } from 'lucide-react'
import { formatIDR, spendingByCategory, summarize, type Transaction } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { SpendingDonut } from './spending-donut'
import { BudgetProgress } from './budget-progress'
import { TransactionRow } from './transaction-row'
import { EmptyState } from './mascot'
import { LevelBadge, useGamification } from './gamification'
import Image from 'next/image'

export function DashboardView({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const { allCategories, hideBalance, toggleHideBalance, getTotalBalance } = useFinwise()
  const { stats } = useGamification()
  const { income, expense, surplus } = summarize(transactions)
  const totalBalance = getTotalBalance()
  const positive = totalBalance >= 0
  const byCat = spendingByCategory(transactions, allCategories)

  const spentMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount)
  }

  const recent = transactions.slice(0, 5)

  return (
    <div className="flex flex-col gap-4">

      {/* ─── Level & XP Badge ─── */}
      <LevelBadge stats={stats} />

      {/* ─── Welcome Banner ─── */}
      <div
        className="clay-card-purple p-4 flex items-center gap-3 relative overflow-hidden"
      >
        <Image
          src="/mascot-64.png"
          alt="FinWise Cat"
          width={64}
          height={64}
          className="shrink-0 drop-shadow-md animate-bounce-soft"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary/70">Halo! 👋</p>
          <h2 className="font-heading text-base font-bold text-[#2D2057]">Keuangan {month}</h2>
          <p className="text-xs text-primary/60 mt-0.5">Tetap semangat mengelola uang! 💪</p>
        </div>
        <div className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {positive ? '✓ Sehat' : '⚠ Defisit'}
        </div>
      </div>

      {/* ─── Balance Card ─── */}
      <div className="clay-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Wallet className="size-4 text-primary" />
            Total Saldo Semua Dompet
          </div>
          <button onClick={toggleHideBalance} className="text-muted-foreground hover:text-primary transition">
            {hideBalance ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <div className={`text-3xl font-bold font-heading ${positive ? 'text-[#2D2057]' : 'text-destructive'}`}>
          {hideBalance ? '••••••' : formatIDR(totalBalance)}
        </div>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Pemasukan */}
        <div className="clay-card-green p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-green-700">
            <ArrowUpRight className="size-3.5" />
            Masuk
          </div>
          <p className="font-bold text-sm text-[#2D2057] tabular-nums leading-tight">
            {hideBalance ? '••••' : formatIDR(income).replace('Rp', '')}
          </p>
        </div>

        {/* Pengeluaran */}
        <div className="clay-card-pink p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-red-500">
            <ArrowDownRight className="size-3.5" />
            Keluar
          </div>
          <p className="font-bold text-sm text-[#2D2057] tabular-nums leading-tight">
            {hideBalance ? '••••' : formatIDR(expense).replace('Rp', '')}
          </p>
        </div>

        {/* Surplus */}
        <div className={`p-3 flex flex-col gap-1 ${surplus >= 0 ? 'clay-card-blue' : 'clay-card-pink'}`}>
          <div className={`flex items-center gap-1 text-[10px] font-semibold ${surplus >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            <TrendingUp className="size-3.5" />
            Surplus
          </div>
          <p className="font-bold text-sm text-[#2D2057] tabular-nums leading-tight">
            {hideBalance ? '••••' : formatIDR(surplus).replace('Rp', '')}
          </p>
        </div>
      </div>

      {/* ─── Spending Donut ─── */}
      {byCat.length > 0 && (
        <div className="clay-card p-4">
          <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3 flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary inline-block" />
            Pengeluaran per Kategori
          </h3>
          <SpendingDonut data={byCat} />
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {byCat.slice(0, 6).map(({ category, value }) => (
              <li key={category.id} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                <span className="truncate text-muted-foreground">{category.label}</span>
                <span className="ml-auto tabular-nums font-medium text-[#2D2057]">{formatIDR(value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Budget Progress ─── */}
      <div className="clay-card-purple p-4">
        <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          Progres Anggaran
        </h3>
        <BudgetProgress spentByCat={spentMap} />
      </div>

      {/* ─── Recent Transactions ─── */}
      <div className="clay-card p-4">
        <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3">
          Transaksi Terakhir
        </h3>
        {recent.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            description="Yuk catat transaksi pertamamu! 🚀"
          />
        ) : (
          <ul className="-mx-2 flex flex-col">{recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</ul>
        )}
      </div>

    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatIDR, getWalletStatsList, spendingByWallet, type Transaction, type Wallet, type Category } from '@/lib/finwise'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet as WalletIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WalletBreakdownChartProps {
  transactions: Transaction[]
  wallets: Wallet[]
}

export function WalletBreakdownChart({ transactions, wallets }: WalletBreakdownChartProps) {
  const data = useMemo(() => spendingByWallet(transactions, wallets), [transactions, wallets])
  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Belum ada pengeluaran bulan ini
      </div>
    )
  }

  return (
    <div className="relative h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="walletName"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.walletId} fill={d.walletColor} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatIDR(Number(value))}
            labelFormatter={(label) => String(label)}
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Total per dompet</span>
        <span className="font-heading text-lg font-semibold tabular-nums">
          {formatIDR(total)}
        </span>
      </div>
    </div>
  )
}

interface WalletStatsViewProps {
  transactions: Transaction[]
  wallets: Wallet[]
  allCategories: Record<string, Category>
  getWalletBalance: (id: string) => number
}

export function WalletStatsView({ transactions, wallets, allCategories, getWalletBalance }: WalletStatsViewProps) {
  const stats = useMemo(
    () => getWalletStatsList(wallets, transactions, getWalletBalance, allCategories),
    [wallets, transactions, getWalletBalance, allCategories]
  )

  const walletBreakdown = useMemo(() => spendingByWallet(transactions, wallets), [transactions, wallets])

  return (
    <div className="flex flex-col gap-4">
      {/* Wallet Breakdown Pie Chart */}
      {walletBreakdown.length > 0 && (
        <div className="clay-card p-4">
          <h3 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <WalletIcon className="size-4 text-primary" />
            Pengeluaran per Dompet
          </h3>
          <WalletBreakdownChart transactions={transactions} wallets={wallets} />
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {walletBreakdown.map((d) => (
              <li key={d.walletId} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: d.walletColor }} />
                <span className="text-muted-foreground truncate">
                  {d.walletIcon} {d.walletName}
                </span>
                <span className="ml-auto tabular-nums font-medium text-foreground">{formatIDR(d.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-Wallet Stats Cards */}
      <div className="grid grid-cols-1 gap-3">
        {stats.map((s) => (
          <div key={s.walletId} className="clay-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex items-center justify-center size-10 rounded-xl text-lg"
                style={{ backgroundColor: `${s.walletColor}20`, color: s.walletColor }}
              >
                {s.walletIcon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-heading text-sm font-bold text-foreground truncate">{s.walletName}</h4>
                <p className="text-xs text-muted-foreground">
                  {s.transactionCount} transaksi
                  {s.topCategory && ` · Teratas: ${s.topCategory}`}
                </p>
              </div>
              <div className={cn(
                'text-right font-heading text-lg font-bold tabular-nums',
                s.balance >= 0 ? 'text-foreground' : 'text-destructive'
              )}>
                {formatIDR(s.balance)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-2">
                <ArrowUpRight className="size-3.5 text-green-600" />
                <div>
                  <p className="text-[10px] text-green-600 font-medium">Masuk</p>
                  <p className="text-xs font-bold tabular-nums text-green-700 dark:text-green-400">
                    {formatIDR(s.totalIncome)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">
                <ArrowDownRight className="size-3.5 text-red-500 dark:text-red-400" />
                <div>
                  <p className="text-[10px] text-red-500 dark:text-red-400 font-medium">Keluar</p>
                  <p className="text-xs font-bold tabular-nums text-red-600 dark:text-red-400">
                    {formatIDR(s.totalExpense)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

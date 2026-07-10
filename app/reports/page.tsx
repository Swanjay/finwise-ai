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
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FinwiseProvider, useFinwise } from '@/components/finwise-store'
import { SpendingDonut } from '@/components/finwise/spending-donut'
import { TransactionRow } from '@/components/finwise/transaction-row'
import {
  formatIDR,
  formatIDRShort,
  summarize,
  spendingByCategory,
  CATEGORIES,
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

  // Transactions for the list (respect period + type filter)
  const txList = useMemo(() => {
    return filtered
      .filter((t) => txFilter === 'all' || t.type === txFilter)
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [filtered, txFilter])

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
          </h3>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Download className="size-3.5" /> Export
          </Button>
        </div>

        {/* Type filter chips */}
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

        {txList.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">Belum ada transaksi di periode ini.</p>
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

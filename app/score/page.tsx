'use client'

import { useMemo } from 'react'
import {
  ArrowLeft,
  TrendingUp,
  PiggyBank,
  ReceiptText,
  Wallet,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FinwiseProvider, useFinwise } from '@/components/finwise-store'
import {
  formatIDR,
  summarize,
  spendingByCategory,
  EXPENSE_CATEGORIES,
  type CategoryId,
} from '@/lib/finwise'

function ScoreContent() {
  const { transactions, monthlyIncome, budgets, allCategories } = useFinwise()

  const metrics = useMemo(() => {
    const { income, expense, surplus } = summarize(transactions)
    const effectiveIncome = income > 0 ? income : monthlyIncome
    const savingRate = effectiveIncome > 0 ? Math.round((surplus / effectiveIncome) * 100) : 0
    const expenseRatio = effectiveIncome > 0 ? Math.round((expense / effectiveIncome) * 100) : 0

    // Budget adherence
    const byCat = spendingByCategory(transactions, allCategories)
    let totalBudget = 0
    let totalSpent = 0
    byCat.forEach(({ category, value }) => {
      const budget = budgets[category.id]
      if (budget && budget > 0) {
        totalBudget += budget
        totalSpent += value
      }
    })
    const budgetAdherence =
      totalBudget > 0
        ? Math.max(0, Math.round((1 - (totalSpent - totalBudget) / totalBudget) * 100))
        : 100

    // Overall score: weighted average
    const score = Math.round(
      Math.min(100, Math.max(0, savingRate * 0.4 + (100 - expenseRatio) * 0.3 + budgetAdherence * 0.3))
    )

    return {
      score,
      savingRate: Math.max(0, savingRate),
      expenseRatio,
      budgetAdherence: Math.min(100, budgetAdherence),
      income: effectiveIncome,
      expense,
      surplus,
    }
  }, [transactions, monthlyIncome, budgets])

  const scoreColor =
    metrics.score >= 70
      ? 'oklch(0.75 0.16 160)'
      : metrics.score >= 40
        ? 'oklch(0.8 0.15 75)'
        : 'oklch(0.68 0.2 18)'

  const scoreLabel =
    metrics.score >= 70 ? 'Sehat' : metrics.score >= 40 ? 'Cukup' : 'Perlu Perbaikan'

  // SVG circular gauge
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (metrics.score / 100) * circumference

  return (
    <div className="flex flex-col gap-5">
      {/* Header with back nav */}
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
          <h1 className="font-heading text-xl font-bold">Skor Kesehatan Finansial</h1>
        </div>
      </div>

      {/* Circular Score Gauge */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-card to-surface-2 neon-glow">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <div className="relative">
            <svg width="170" height="170" viewBox="0 0 170 170" className="-rotate-90">
              <circle
                cx="85"
                cy="85"
                r={radius}
                stroke="oklch(0.27 0.03 285)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="85"
                cy="85"
                r={radius}
                stroke={scoreColor}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: `drop-shadow(0 0 8px ${scoreColor})`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="font-heading text-4xl font-bold tabular-nums"
                style={{ color: scoreColor }}
              >
                {metrics.score}
              </span>
              <span className="text-xs text-muted-foreground">dari 100</span>
            </div>
          </div>
          <div
            className="rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{
              backgroundColor: `color-mix(in oklch, ${scoreColor} 15%, transparent)`,
              color: scoreColor,
            }}
          >
            <ShieldCheck className="mr-1 inline size-4" />
            {scoreLabel}
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-3">
        {/* Saving Rate */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'color-mix(in oklch, oklch(0.75 0.16 160) 15%, transparent)',
              }}
            >
              <PiggyBank className="size-5" style={{ color: 'oklch(0.75 0.16 160)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Saving Rate</p>
              <p className="text-xs text-muted-foreground">
                Persentase pemasukan yang berhasil ditabung
              </p>
            </div>
            <div className="text-right">
              <p
                className="font-heading text-2xl font-bold tabular-nums"
                style={{ color: 'oklch(0.75 0.16 160)' }}
              >
                {metrics.savingRate}%
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatIDR(metrics.surplus)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expense Ratio */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `color-mix(in oklch, ${metrics.expenseRatio > 80 ? 'oklch(0.68 0.2 18)' : 'oklch(0.7 0.18 295)'} 15%, transparent)`,
              }}
            >
              <ReceiptText
                className="size-5"
                style={{
                  color: metrics.expenseRatio > 80 ? 'oklch(0.68 0.2 18)' : 'oklch(0.7 0.18 295)',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Rasio Pengeluaran</p>
              <p className="text-xs text-muted-foreground">
                Pengeluaran vs pemasukan (ideal &lt; 70%)
              </p>
            </div>
            <div className="text-right">
              <p
                className="font-heading text-2xl font-bold tabular-nums"
                style={{
                  color: metrics.expenseRatio > 80 ? 'oklch(0.68 0.2 18)' : 'oklch(0.7 0.18 295)',
                }}
              >
                {metrics.expenseRatio}%
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatIDR(metrics.expense)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Budget Adherence */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `color-mix(in oklch, ${metrics.budgetAdherence >= 80 ? 'oklch(0.75 0.16 160)' : metrics.budgetAdherence >= 50 ? 'oklch(0.8 0.15 75)' : 'oklch(0.68 0.2 18)'} 15%, transparent)`,
              }}
            >
              <Wallet
                className="size-5"
                style={{
                  color:
                    metrics.budgetAdherence >= 80
                      ? 'oklch(0.75 0.16 160)'
                      : metrics.budgetAdherence >= 50
                        ? 'oklch(0.8 0.15 75)'
                        : 'oklch(0.68 0.2 18)',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Kepatuhan Anggaran</p>
              <p className="text-xs text-muted-foreground">
                Seberapa dekat pengeluaranmu sesuai budget
              </p>
            </div>
            <div className="text-right">
              <p
                className="font-heading text-2xl font-bold tabular-nums"
                style={{
                  color:
                    metrics.budgetAdherence >= 80
                      ? 'oklch(0.75 0.16 160)'
                      : metrics.budgetAdherence >= 50
                        ? 'oklch(0.8 0.15 75)'
                        : 'oklch(0.68 0.2 18)',
                }}
              >
                {metrics.budgetAdherence}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <TrendingUp className="size-4 text-primary" />
            Rekomendasi
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {metrics.income === 0 && metrics.expense === 0 && (
            <p className="rounded-xl bg-secondary p-3 text-muted-foreground">
              👋 Mulai catat transaksi dan atur anggaran untuk melihat rekomendasi personal.
            </p>
          )}
          {metrics.savingRate < 20 && metrics.income > 0 && (
            <p className="rounded-xl bg-warning/10 p-3 text-warning">
              💡 Saving rate-mu di bawah 20%. Coba kurangi pengeluaran non-esensial dan alokasikan
              minimal 20% dari pemasukan untuk tabungan.
            </p>
          )}
          {metrics.expenseRatio > 80 && metrics.income > 0 && (
            <p className="rounded-xl bg-destructive/10 p-3 text-destructive">
              ⚠️ Rasio pengeluaranmu tinggi ({metrics.expenseRatio}%). Periksa kategori dengan
              pengeluaran terbesar dan cari peluang untuk berhemat.
            </p>
          )}
          {metrics.budgetAdherence < 60 && metrics.income > 0 && (
            <p className="rounded-xl bg-destructive/10 p-3 text-destructive">
              📊 Kepatuhan anggaran rendah. Beberapa kategori sudah melebihi limit. Cek tab Anggaran
              untuk detail.
            </p>
          )}
          {metrics.score >= 70 && metrics.income > 0 && (
            <p className="rounded-xl bg-success/10 p-3 text-success">
              ✨ Keuanganmu sehat! Pertahankan pola menabung dan tetap pantau pengeluaran.
            </p>
          )}
          {metrics.score >= 40 && metrics.score < 70 && metrics.income > 0 && (
            <p className="rounded-xl bg-secondary p-3 text-muted-foreground">
              📈 Keuanganmu cukup baik, tapi masih ada ruang untuk perbaikan. Fokuskan pada
              peningkatan saving rate.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ScorePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-6">
      <FinwiseProvider>
        <ScoreContent />
      </FinwiseProvider>
    </div>
  )
}

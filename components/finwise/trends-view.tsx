'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  Target,
  PiggyBank,
  CalendarDays,
  BarChart3,
  Activity,
  Lightbulb,
} from 'lucide-react'
import {
  formatIDR,
  formatIDRShort,
  BUILTIN_CATEGORIES,
  spendingByCategory,
  summarize,
  getMonthKey,
  getMonthLabel,
  filterByMonth,
  type Transaction,
  type Category,
} from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'

// ─── Donut Chart ───
function CategoryDonut({
  data,
  total,
}: {
  data: { category: Category; value: number }[]
  total: number
}) {
  if (data.length === 0)
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
        Belum ada pengeluaran
      </div>
    )

  return (
    <div className="relative h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="category.label"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.category.id} fill={d.category.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => formatIDR(v)}
            contentStyle={{
              borderRadius: 16,
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              fontSize: 12,
              fontFamily: 'Poppins',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-muted-foreground">Total</span>
        <span className="font-heading text-sm font-semibold tabular-nums">
          {formatIDRShort(total)}
        </span>
      </div>
    </div>
  )
}

// ─── Savings Rate Gauge ───
function SavingsGauge({ rate }: { rate: number }) {
  const clamped = Math.max(-50, Math.min(100, rate))
  const pct = ((clamped + 50) / 150) * 100
  const color =
    rate >= 30
      ? 'text-emerald-500'
      : rate >= 20
        ? 'text-green-500'
        : rate >= 10
          ? 'text-yellow-500'
          : rate >= 0
            ? 'text-orange-500'
            : 'text-red-500'
  const emoji = rate >= 30 ? '🏆' : rate >= 20 ? '💪' : rate >= 10 ? '👍' : rate >= 0 ? '😬' : '🚨'
  const label =
    rate >= 30
      ? 'Luar biasa! Kamu penyimpan handal!'
      : rate >= 20
        ? 'Bagus! Di atas rata-rata!'
        : rate >= 10
          ? 'Cukup baik, tingkatkan lagi!'
          : rate >= 0
            ? 'Pas-pasan, coba kurangi pengeluaran'
            : 'Defisit! Pengeluaran melebihi pemasukan'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-3xl">{emoji}</div>
      <div className="text-center">
        <span className={`font-heading text-2xl font-bold ${color}`}>{rate}%</span>
        <p className="text-xs text-muted-foreground">Saving Rate</p>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${
            rate >= 20 ? 'bg-emerald-500' : rate >= 10 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, rate))}%` }}
        />
        {/* 20% target marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/30"
          style={{ left: '20%' }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

// ─── Spending Heatmap ───
function SpendingHeatmap({
  transactions,
  monthKey,
}: {
  transactions: Transaction[]
  monthKey: string
}) {
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay() // 0=Sun

  // Sum expenses per day
  const dailySpend: Record<number, number> = {}
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const day = Number(t.date.slice(8, 10))
    dailySpend[day] = (dailySpend[day] ?? 0) + t.amount
  }

  const maxSpend = Math.max(...Object.values(dailySpend), 1)

  const getIntensity = (amount: number) => {
    if (amount === 0) return 0
    const ratio = amount / maxSpend
    if (ratio > 0.75) return 4
    if (ratio > 0.5) return 3
    if (ratio > 0.25) return 2
    return 1
  }

  const intensityColors = [
    'bg-muted',
    'bg-emerald-200 dark:bg-emerald-900',
    'bg-emerald-300 dark:bg-emerald-700',
    'bg-orange-400 dark:bg-orange-700',
    'bg-red-500 dark:bg-red-600',
  ]

  const dayNames = ['S', 'S', 'R', 'K', 'J', 'S', 'M']

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-muted-foreground">
        {dayNames.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-sm" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const amount = dailySpend[day] ?? 0
          const intensity = getIntensity(amount)
          const isToday =
            `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` ===
            getMonthKey(new Date()) + `-${String(new Date().getDate()).padStart(2, '0')}`

          return (
            <div
              key={day}
              className={`aspect-square rounded-sm ${intensityColors[intensity]} ${
                isToday ? 'ring-2 ring-primary' : ''
              }`}
              title={`${day}: ${amount > 0 ? formatIDR(amount) : 'Rp0'}`}
            />
          )
        })}
      </div>
      <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
        <span>Sedikit</span>
        {intensityColors.map((c, i) => (
          <div key={i} className={`size-3 rounded-sm ${c}`} />
        ))}
        <span>Banyak</span>
      </div>
    </div>
  )
}

// ─── Weekday Pattern ───
function WeekdayChart({ transactions }: { transactions: Transaction[] }) {
  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const dailyTotals = Array(7).fill(0)
  const dayCounts = Array(7).fill(0)

  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const dow = new Date(t.date).getDay()
    dailyTotals[dow] += t.amount
    dayCounts[dow]++
  }

  const dailyAvg = dailyTotals.map((total, i) => ({
    day: dayLabels[i],
    avg: dayCounts[i] > 0 ? Math.round(total / dayCounts[i]) : 0,
    total: dailyTotals[i],
  }))

  const maxAvg = Math.max(...dailyAvg.map((d) => d.avg), 1)
  const maxDayIdx = dailyAvg.reduce((max, d, i) => (d.avg > dailyAvg[max].avg ? i : max), 0)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-1" style={{ height: 100 }}>
        {dailyAvg.map((d, i) => {
          const height = d.avg > 0 ? Math.max(8, (d.avg / maxAvg) * 100) : 4
          const isMax = i === maxDayIdx && d.avg > 0
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] tabular-nums text-muted-foreground">
                {d.avg > 0 ? formatIDRShort(d.avg) : '-'}
              </span>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${
                  isMax ? 'bg-primary' : 'bg-primary/30'
                }`}
                style={{ height: `${height}%` }}
              />
              <span className={`text-[10px] ${isMax ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {d.day}
              </span>
            </div>
          )
        })}
      </div>
      {dailyAvg[maxDayIdx]?.avg > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Hari terboros: <span className="font-semibold text-foreground">{dayLabels[maxDayIdx]}</span> (rata-rata{' '}
          {formatIDR(dailyAvg[maxDayIdx].avg)}/hari)
        </p>
      )}
    </div>
  )
}

// ─── Main TrendsView ───
export function TrendsView() {
  const { transactions, allCategories, monthlyIncome, budgets } = useFinwise()
  const [monthOffset, setMonthOffset] = useState(0)

  // Current display month
  const displayDate = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [monthOffset])
  const monthKey = getMonthKey(displayDate)

  // Current month transactions
  const monthTxs = useMemo(
    () => filterByMonth(transactions, monthKey),
    [transactions, monthKey],
  )

  // Previous month transactions
  const prevMonthDate = useMemo(() => {
    const d = new Date(displayDate)
    d.setMonth(d.getMonth() - 1)
    return d
  }, [displayDate])
  const prevMonthKey = getMonthKey(prevMonthDate)
  const prevMonthTxs = useMemo(
    () => filterByMonth(transactions, prevMonthKey),
    [transactions, prevMonthKey],
  )

  // Summaries
  const current = summarize(monthTxs)
  const previous = summarize(prevMonthTxs)
  const expenseDiff =
    previous.expense > 0
      ? Math.round(((current.expense - previous.expense) / previous.expense) * 100)
      : 0

  // Category breakdown
  const categoryData = useMemo(
    () => spendingByCategory(monthTxs, allCategories),
    [monthTxs, allCategories],
  )

  // Savings rate
  const effectiveIncome = current.income > 0 ? current.income : monthlyIncome
  const savingsRate =
    effectiveIncome > 0 ? Math.round(((effectiveIncome - current.expense) / effectiveIncome) * 100) : 0

  // Cash flow prediction
  const today = new Date()
  const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate()
  const currentDay = monthOffset === 0 ? today.getDate() : daysInMonth
  const dailyBurnRate = currentDay > 0 ? current.expense / currentDay : 0
  const projectedExpense = Math.round(dailyBurnRate * daysInMonth)
  const projectedSurplus = effectiveIncome - projectedExpense
  const monthProgress = Math.round((currentDay / daysInMonth) * 100)

  // 6-month bar chart
  const barData = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i + monthOffset)
      const mk = getMonthKey(d)
      const txs = filterByMonth(transactions, mk)
      const s = summarize(txs)
      months.push({
        month: getMonthLabel(mk).split(' ')[0],
        income: s.income,
        expense: s.expense,
      })
    }
    return months
  }, [transactions, monthOffset])

  // Top categories
  const topCategories = categoryData.slice(0, 5)

  // Generate insights
  const insights = useMemo(() => {
    const list: { type: 'success' | 'warning' | 'info'; icon: string; text: string }[] = []

    // 1. Month comparison
    if (previous.expense > 0) {
      if (expenseDiff < -10) {
        list.push({
          type: 'success',
          icon: '📉',
          text: `Pengeluaran turun ${Math.abs(expenseDiff)}% dari ${getMonthLabel(prevMonthKey)}! Hemat ${formatIDRShort(previous.expense - current.expense)}.`,
        })
      } else if (expenseDiff > 10) {
        list.push({
          type: 'warning',
          icon: '📈',
          text: `Pengeluaran naik ${expenseDiff}% dari ${getMonthLabel(prevMonthKey)}. Cek kategori terbesar.`,
        })
      }
    }

    // 2. Top spending category
    if (topCategories.length > 0) {
      const pct = Math.round((topCategories[0].value / Math.max(current.expense, 1)) * 100)
      list.push({
        type: 'info',
        icon: '🏷️',
        text: `${topCategories[0].category.label} mendominasi: ${pct}% dari total pengeluaran (${formatIDRShort(topCategories[0].value)}).`,
      })
    }

    // 3. Savings rate
    if (effectiveIncome > 0) {
      if (savingsRate >= 30) {
        list.push({ type: 'success', icon: '🏆', text: `Saving rate ${savingsRate}% — luar biasa! Kamu di top saver.` })
      } else if (savingsRate < 0) {
        list.push({ type: 'warning', icon: '🚨', text: `Defisit! Pengeluaran melebihi pemasukan ${formatIDRShort(Math.abs(current.surplus))}.` })
      }
    }

    // 4. Daily spending pattern
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const dailyTotals = Array(7).fill(0)
    const dayCounts = Array(7).fill(0)
    for (const t of monthTxs) {
      if (t.type !== 'expense') continue
      const dow = new Date(t.date).getDay()
      dailyTotals[dow] += t.amount
      dayCounts[dow]++
    }
    const dailyAvgArr = dailyTotals.map((tot, i) => (dayCounts[i] > 0 ? tot / dayCounts[i] : 0))
    const maxDay = dailyAvgArr.reduce((max, d, i) => (d > dailyAvgArr[max] ? i : max), 0)
    if (dailyAvgArr[maxDay] > 0 && dayCounts[maxDay] >= 2) {
      list.push({
        type: 'info',
        icon: '📅',
        text: `Hari paling boros: ${dayNames[maxDay]} (rata-rata ${formatIDRShort(Math.round(dailyAvgArr[maxDay]))}).`,
      })
    }

    // 5. Transaction count
    if (monthTxs.length > 0) {
      list.push({
        type: 'info',
        icon: '🧾',
        text: `${monthTxs.length} transaksi bulan ini. Rata-rata ${formatIDRShort(Math.round(current.expense / Math.max(monthTxs.filter(t => t.type === 'expense').length, 1)))}/transaksi.`,
      })
    }

    // Fallback if no insights
    if (list.length === 0) {
      list.push({
        type: 'info',
        icon: '💡',
        text: 'Mulai catat transaksi untuk mendapatkan insights otomatis tentang keuanganmu!',
      })
    }

    return list
  }, [monthTxs, previous, current, expenseDiff, prevMonthKey, topCategories, effectiveIncome, savingsRate])

  const hasData = transactions.length > 0
  const hasMonthData = monthTxs.length > 0

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* ─── Header with Month Selector ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            {getMonthLabel(monthKey)}
          </h2>
          <p className="text-xs text-muted-foreground">
            {hasMonthData
              ? `${monthTxs.length} transaksi`
              : 'Belum ada transaksi'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="flex size-9 items-center justify-center rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <ChevronLeft className="size-4" />
          </button>
          {monthOffset !== 0 && (
            <button
              onClick={() => setMonthOffset(0)}
              className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
            >
              Hari ini
            </button>
          )}
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            disabled={monthOffset >= 0}
            className="flex size-9 items-center justify-center rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ─── Row 1: Donut + Comparison ─── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Donut */}
        <Card className="col-span-1">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BarChart3 className="size-3" />
              Kategori
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CategoryDonut data={categoryData} total={current.expense} />
            {/* Legend */}
            <div className="mt-2 flex flex-col gap-1">
              {topCategories.slice(0, 3).map((c) => {
                const pct = Math.round((c.value / Math.max(current.expense, 1)) * 100)
                return (
                  <div key={c.category.id} className="flex items-center gap-1.5 text-[10px]">
                    <div
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.category.color }}
                    />
                    <span className="flex-1 truncate text-muted-foreground">{c.category.label}</span>
                    <span className="font-medium tabular-nums">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Month Comparison + Savings */}
        <div className="col-span-1 flex flex-col gap-3">
          {/* vs Last Month */}
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {expenseDiff <= 0 ? (
                  <TrendingDown className="size-3 text-emerald-500" />
                ) : (
                  <TrendingUp className="size-3 text-red-500" />
                )}
                vs Bulan Lalu
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {previous.expense > 0 ? (
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`font-heading text-2xl font-bold ${
                      expenseDiff <= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {expenseDiff > 0 ? '+' : ''}
                    {expenseDiff}%
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {expenseDiff <= 0 ? 'Lebih hemat!' : 'Lebih boros'}
                  </p>
                  <div className="mt-1 w-full rounded-xl bg-muted p-2 text-center">
                    <span className="text-[10px] text-muted-foreground">
                      {getMonthLabel(prevMonthKey)}:{' '}
                      <span className="font-medium text-foreground">
                        {formatIDRShort(previous.expense)}
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Tidak ada data bulan lalu
                </p>
              )}
            </CardContent>
          </Card>

          {/* Savings Rate Mini */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-2xl ${
                    savingsRate >= 20
                      ? 'bg-emerald-100 text-emerald-600'
                      : savingsRate >= 0
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-red-100 text-red-600'
                  }`}
                >
                  <PiggyBank className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground">Saving Rate</p>
                  <p
                    className={`font-heading text-lg font-bold ${
                      savingsRate >= 20
                        ? 'text-emerald-500'
                        : savingsRate >= 0
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }`}
                  >
                    {savingsRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Row 2: Cash Flow Prediction ─── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="size-4 text-primary" />
            Prediksi Cash Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasMonthData && effectiveIncome > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Proyeksi akhir bulan</p>
                  <p
                    className={`font-heading text-xl font-bold ${
                      projectedSurplus >= 0 ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {projectedSurplus >= 0 ? '+' : ''}
                    {formatIDRShort(projectedSurplus)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Harian rata-rata</p>
                  <p className="font-heading text-sm font-semibold">
                    {formatIDRShort(Math.round(dailyBurnRate))}/hari
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Terpakai {monthProgress}%</span>
                  <span className="text-muted-foreground">
                    {formatIDRShort(current.expense)} / {formatIDRShort(effectiveIncome)}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${
                      monthProgress > 90
                        ? 'bg-red-500'
                        : monthProgress > 70
                          ? 'bg-orange-500'
                          : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, monthProgress)}%` }}
                  />
                </div>
              </div>
              <p className="text-center text-[10px] text-muted-foreground">
                {projectedSurplus >= 0
                  ? `Di rate ini, akhir bulan sisa ${formatIDRShort(projectedSurplus)}`
                  : `⚠️ Di rate ini, akhir bulan defisit ${formatIDRShort(Math.abs(projectedSurplus))}`}
              </p>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {!effectiveIncome
                ? 'Atur pemasukan bulanan di Settings untuk prediksi'
                : 'Mulai catat transaksi untuk prediksi cash flow'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Row 3: Savings Gauge (full width) ─── */}
      {hasMonthData && effectiveIncome > 0 && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <PiggyBank className="size-4 text-primary" />
              Saving Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SavingsGauge rate={savingsRate} />
          </CardContent>
        </Card>
      )}

      {/* ─── Row 4: Top 5 Categories ─── */}
      {topCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="size-4 text-primary" />
              Top {topCategories.length} Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {topCategories.map((c, i) => {
              const pct = Math.round((c.value / Math.max(current.expense, 1)) * 100)
              const Icon = c.category.icon
              return (
                <div key={c.category.id} className="flex items-center gap-3">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${c.category.color}20` }}
                  >
                    <Icon className="size-4" style={{ color: c.category.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-xs font-medium">{c.category.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatIDRShort(c.value)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: c.category.color,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right text-xs font-semibold tabular-nums text-foreground">
                    {pct}%
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Row 5: 6-Month Bar Chart ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4 text-primary" />
            Tren 6 Bulan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  tickFormatter={(v) => formatIDRShort(v)}
                  width={48}
                />
                <Tooltip
                  formatter={(v: number) => formatIDR(v)}
                  contentStyle={{
                    borderRadius: 16,
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    fontSize: 11,
                    fontFamily: 'Poppins',
                  }}
                />
                <Bar
                  dataKey="income"
                  fill="oklch(0.75 0.16 160)"
                  radius={[6, 6, 0, 0]}
                  name="Pemasukan"
                />
                <Bar
                  dataKey="expense"
                  fill="oklch(0.7 0.18 295)"
                  radius={[6, 6, 0, 0]}
                  name="Pengeluaran"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[oklch(0.75_0.16_160)]" />
              Pemasukan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[oklch(0.7_0.18_295)]" />
              Pengeluaran
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ─── Row 6: Spending Heatmap ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 text-primary" />
            Heatmap Pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasMonthData ? (
            <SpendingHeatmap transactions={monthTxs} monthKey={monthKey} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada data untuk heatmap
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Row 7: Weekday Pattern ─── */}
      {hasMonthData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="size-4 text-primary" />
              Pola Harian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeekdayChart transactions={monthTxs} />
          </CardContent>
        </Card>
      )}

      {/* ─── Row 8: AI Insights ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="size-4 text-primary" />
            Insights AI
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-2xl p-3 text-sm ${
                ins.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : ins.type === 'warning'
                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
              }`}
            >
              <span className="text-base">{ins.icon}</span>
              <span className="leading-relaxed">{ins.text}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

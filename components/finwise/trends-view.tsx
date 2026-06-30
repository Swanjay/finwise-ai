'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  AreaChart,
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
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Layers,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
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

// ─── Types ───
type TabId = 'overview' | 'categories' | 'patterns' | 'networth'

const TABS: { id: TabId; label: string; icon: typeof Layers }[] = [
  { id: 'overview', label: 'Ringkasan', icon: Layers },
  { id: 'categories', label: 'Kategori', icon: PieChartIcon },
  { id: 'patterns', label: 'Pola', icon: Flame },
  { id: 'networth', label: 'Kekayaan', icon: LineChartIcon },
]

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
            formatter={(v) => formatIDR(Number(v))}
            contentStyle={{
              borderRadius: 16,
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              fontSize: 12,
              fontFamily: 'Inter',
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

// ─── Weekday Pattern (recharts bar chart) ───
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

  const chartData = dayLabels.map((label, i) => ({
    day: label,
    avg: dayCounts[i] > 0 ? Math.round(dailyTotals[i] / dayCounts[i]) : 0,
    total: dailyTotals[i],
    count: dayCounts[i],
  }))

  const maxAvg = Math.max(...chartData.map((d) => d.avg), 1)
  const maxDayIdx = chartData.reduce((max, d, i) => (d.avg > chartData[max].avg ? i : max), 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="day"
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
              formatter={(v, name) => [formatIDR(Number(v)), name === 'avg' ? 'Rata-rata' : 'Total']}
              contentStyle={{
                borderRadius: 16,
                border: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                fontSize: 11,
                fontFamily: 'Inter',
              }}
            />
            <Bar dataKey="avg" name="Rata-rata" radius={[6, 6, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={d.day}
                  fill={i === maxDayIdx && d.avg > 0 ? 'var(--primary)' : 'var(--primary)'}
                  fillOpacity={i === maxDayIdx && d.avg > 0 ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {chartData[maxDayIdx]?.avg > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Hari terboros: <span className="font-semibold text-foreground">{dayLabels[maxDayIdx]}</span> (rata-rata{' '}
          {formatIDR(chartData[maxDayIdx].avg)}/hari)
        </p>
      )}
    </div>
  )
}

// ─── Category Trends (current vs previous month per category) ───
function CategoryTrends({
  currentTxs,
  previousTxs,
  allCategories,
}: {
  currentTxs: Transaction[]
  previousTxs: Transaction[]
  allCategories: Record<string, Category>
}) {
  const trends = useMemo(() => {
    const currentByCat = spendingByCategory(currentTxs, allCategories)
    const previousByCat = spendingByCategory(previousTxs, allCategories)

    const prevMap = new Map(previousByCat.map((c) => [c.category.id, c.value]))

    return currentByCat.map((c) => {
      const prevValue = prevMap.get(c.category.id) ?? 0
      const change =
        prevValue > 0
          ? Math.round(((c.value - prevValue) / prevValue) * 100)
          : c.value > 0
            ? 100
            : 0
      return {
        category: c.category,
        current: c.value,
        previous: prevValue,
        change,
      }
    })
  }, [currentTxs, previousTxs, allCategories])

  if (trends.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Belum ada data pengeluaran bulan ini
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {trends.map((t) => {
        const Icon = t.category.icon
        const isUp = t.change > 0
        const isDown = t.change < 0
        const isNeutral = t.change === 0
        const isSignificant = Math.abs(t.change) >= 10

        return (
          <div key={t.category.id} className="flex items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${t.category.color}20` }}
            >
              <Icon className="size-5" style={{ color: t.category.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-medium">{t.category.label}</span>
                <span className="text-sm tabular-nums font-semibold">{formatIDRShort(t.current)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Bulan lalu: {t.previous > 0 ? formatIDRShort(t.previous) : '—'}
                </span>
                <div
                  className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isNeutral
                      ? 'bg-muted text-muted-foreground'
                      : isDown
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : isSignificant
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                  }`}
                >
                  {isDown ? (
                    <ArrowDownRight className="size-3" />
                  ) : isUp ? (
                    <ArrowUpRight className="size-3" />
                  ) : null}
                  {isNeutral ? '—' : `${isUp ? '+' : ''}${t.change}%`}
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, t.current > 0 ? Math.max(5, (t.current / Math.max(...trends.map((x) => x.current), 1)) * 100) : 0)}%`,
                    backgroundColor: t.category.color,
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Net Worth Tracker (area/line chart) ───
function NetWorthChart({
  transactions,
  wallets,
  getWalletBalance,
  monthlyIncome,
  monthOffset,
}: {
  transactions: Transaction[]
  wallets: { id: string; name: string; balance: number }[]
  getWalletBalance: (id: string) => number
  monthlyIncome: number
  monthOffset: number
}) {
  const data = useMemo(() => {
    const months: { month: string; netWorth: number; income: number; expense: number }[] = []
    const totalWalletBalance = wallets.reduce((sum, w) => sum + getWalletBalance(w.id), 0)

    // Build cumulative net worth from oldest to newest
    const allMonths: { key: string; income: number; expense: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i + monthOffset)
      const mk = getMonthKey(d)
      const txs = filterByMonth(transactions, mk)
      const s = summarize(txs)
      allMonths.push({ key: mk, income: s.income, expense: s.expense })
    }

    // Calculate net worth as running total
    // Start from current total balance and work backwards
    let runningNetWorth = totalWalletBalance

    // First, calculate total income-expense for all shown months
    const totalNet = allMonths.reduce((sum, m) => sum + m.income - m.expense, 0)

    // Start value = current balance - all shown months' net
    let cumulative = totalWalletBalance - totalNet

    for (const m of allMonths) {
      cumulative += m.income - m.expense
      months.push({
        month: getMonthLabel(m.key).split(' ')[0],
        netWorth: Math.round(cumulative),
        income: m.income,
        expense: m.expense,
      })
    }

    return months
  }, [transactions, wallets, getWalletBalance, monthOffset])

  if (data.every((d) => d.income === 0 && d.expense === 0)) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Belum ada data transaksi untuk melacak kekayaan bersih
      </p>
    )
  }

  const latestNetWorth = data[data.length - 1]?.netWorth ?? 0
  const prevNetWorth = data[data.length - 2]?.netWorth ?? 0
  const netWorthChange = prevNetWorth !== 0
    ? Math.round(((latestNetWorth - prevNetWorth) / Math.abs(prevNetWorth)) * 100)
    : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Summary card */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Kekayaan Bersih</p>
          <p className={`font-heading text-xl font-bold tabular-nums ${
            latestNetWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {formatIDR(latestNetWorth)}
          </p>
        </div>
        {netWorthChange !== 0 && (
          <div
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
              netWorthChange > 0
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
            }`}
          >
            {netWorthChange > 0 ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {netWorthChange > 0 ? '+' : ''}{netWorthChange}%
          </div>
        )}
      </div>

      {/* Area chart */}
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              width={52}
            />
            <Tooltip
              formatter={(v) => formatIDR(Number(v))}
              contentStyle={{
                borderRadius: 16,
                border: 'none',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                fontSize: 11,
                fontFamily: 'Inter',
              }}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="var(--primary)"
              strokeWidth={2.5}
              fill="url(#netWorthGrad)"
              name="Kekayaan Bersih"
              dot={false}
              activeDot={{ r: 5, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {data.slice(-3).reverse().map((d) => (
          <div key={d.month} className="rounded-xl bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">{d.month}</p>
            <p className="text-xs font-semibold tabular-nums">{formatIDRShort(d.netWorth)}</p>
            <p className={`text-[10px] tabular-nums ${
              d.income - d.expense >= 0 ? 'text-emerald-500' : 'text-red-500'
            }`}>
              {d.income - d.expense >= 0 ? '+' : ''}{formatIDRShort(d.income - d.expense)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Savings Rate Comparison (current vs previous) ───
function SavingsRateComparison({
  currentIncome,
  currentExpense,
  previousIncome,
  previousExpense,
}: {
  currentIncome: number
  currentExpense: number
  previousIncome: number
  previousExpense: number
}) {
  const currentRate = currentIncome > 0 ? Math.round(((currentIncome - currentExpense) / currentIncome) * 100) : 0
  const previousRate = previousIncome > 0 ? Math.round(((previousIncome - previousExpense) / previousIncome) * 100) : 0
  const diff = currentRate - previousRate

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-muted/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Bulan Ini</p>
          <p
            className={`font-heading text-2xl font-bold ${
              currentRate >= 20
                ? 'text-emerald-500'
                : currentRate >= 0
                  ? 'text-yellow-500'
                  : 'text-red-500'
            }`}
          >
            {currentRate}%
          </p>
        </div>
        <div className="rounded-2xl bg-muted/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Bulan Lalu</p>
          <p
            className={`font-heading text-2xl font-bold ${
              previousRate >= 20
                ? 'text-emerald-500'
                : previousRate >= 0
                  ? 'text-yellow-500'
                  : 'text-red-500'
            }`}
          >
            {previousRate > 0 || previousIncome > 0 ? `${previousRate}%` : '—'}
          </p>
        </div>
      </div>
      {previousIncome > 0 && (
        <div
          className={`flex items-center justify-center gap-1 rounded-xl p-2 text-sm font-semibold ${
            diff > 0
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
              : diff < 0
                ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {diff > 0 ? (
            <TrendingUp className="size-4" />
          ) : diff < 0 ? (
            <TrendingDown className="size-4" />
          ) : null}
          {diff > 0 ? '+' : ''}{diff}% dari bulan lalu
        </div>
      )}
    </div>
  )
}

// ─── Main TrendsView ───
export function TrendsView() {
  const { transactions, allCategories, monthlyIncome, wallets, getWalletBalance, getTotalBalance } = useFinwise()
  const [monthOffset, setMonthOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

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

      {/* ─── Tab Navigation ─── */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-muted/50 p-1 no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── Tab Content ─── */}

      {/* === OVERVIEW TAB === */}
      {activeTab === 'overview' && (
        <>
          {/* Row 1: Donut + Comparison */}
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

          {/* Cash Flow Prediction */}
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

          {/* 6-Month Income vs Expense Bar Chart */}
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
                      formatter={(v) => formatIDR(Number(v))}
                      contentStyle={{
                        borderRadius: 16,
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        fontSize: 11,
                        fontFamily: 'Inter',
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

          {/* AI Insights */}
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
        </>
      )}

      {/* === CATEGORIES TAB === */}
      {activeTab === 'categories' && (
        <>
          {/* Savings Rate Comparison */}
          {effectiveIncome > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PiggyBank className="size-4 text-primary" />
                  Saving Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SavingsRateComparison
                  currentIncome={effectiveIncome}
                  currentExpense={current.expense}
                  previousIncome={previous.income > 0 ? previous.income : monthlyIncome}
                  previousExpense={previous.expense}
                />
              </CardContent>
            </Card>
          )}

          {/* Category Trends */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="size-4 text-primary" />
                Tren per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryTrends
                currentTxs={monthTxs}
                previousTxs={prevMonthTxs}
                allCategories={allCategories}
              />
            </CardContent>
          </Card>

          {/* Top Categories with full donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="size-4 text-primary" />
                Top Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryDonut data={categoryData} total={current.expense} />
              <div className="mt-3 flex flex-col gap-2.5">
                {categoryData.map((c) => {
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
              </div>
            </CardContent>
          </Card>

          {/* Savings Gauge (full) */}
          {hasMonthData && effectiveIncome > 0 && (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PiggyBank className="size-4 text-primary" />
                  Saving Rate Detail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SavingsGauge rate={savingsRate} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* === PATTERNS TAB === */}
      {activeTab === 'patterns' && (
        <>
          {/* Spending Heatmap */}
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

          {/* Weekday Pattern */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Flame className="size-4 text-primary" />
                Pola Harian
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasMonthData ? (
                <WeekdayChart transactions={monthTxs} />
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada data untuk analisis pola
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cash Flow Prediction (repeat for easy access) */}
          {hasMonthData && effectiveIncome > 0 && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="size-4 text-primary" />
                  Prediksi Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
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
        </>
      )}

      {/* === NET WORTH TAB === */}
      {activeTab === 'networth' && (
        <>
          {/* Net Worth Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wallet className="size-4 text-primary" />
                Kekayaan Bersih
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NetWorthChart
                transactions={transactions}
                wallets={wallets}
                getWalletBalance={getWalletBalance}
                monthlyIncome={monthlyIncome}
                monthOffset={monthOffset}
              />
            </CardContent>
          </Card>

          {/* 6-Month Income vs Expense (detailed) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4 text-primary" />
                Pemasukan vs Pengeluaran (6 Bulan)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52 w-full">
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
                      formatter={(v) => formatIDR(Number(v))}
                      contentStyle={{
                        borderRadius: 16,
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        fontSize: 11,
                        fontFamily: 'Inter',
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
              {/* Ratio breakdown */}
              <div className="mt-3 flex flex-col gap-2">
                {barData.map((m) => {
                  const ratio = m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0
                  const isPositive = m.income >= m.expense
                  return (
                    <div key={m.month} className="flex items-center gap-2 text-xs">
                      <span className="w-8 font-medium text-muted-foreground">{m.month}</span>
                      <div className="flex-1">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`absolute left-0 top-0 h-full rounded-full ${
                              isPositive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, m.income > 0 ? (m.income / Math.max(m.income, m.expense)) * 100 : 0))}%` }}
                          />
                        </div>
                      </div>
                      <span className={`w-12 text-right font-semibold tabular-nums ${
                        isPositive ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {ratio > 0 ? '+' : ''}{ratio}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Current Month Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="size-4 text-primary" />
                Ringkasan Bulan Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Pemasukan</p>
                  <p className="font-heading text-sm font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {formatIDRShort(current.income)}
                  </p>
                </div>
                <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 p-3 text-center">
                  <p className="text-[10px] text-red-600 dark:text-red-400">Pengeluaran</p>
                  <p className="font-heading text-sm font-bold text-red-700 dark:text-red-300 tabular-nums">
                    {formatIDRShort(current.expense)}
                  </p>
                </div>
                <div className={`rounded-2xl p-3 text-center ${
                  current.surplus >= 0
                    ? 'bg-blue-50 dark:bg-blue-950/30'
                    : 'bg-orange-50 dark:bg-orange-950/30'
                }`}>
                  <p className={`text-[10px] ${
                    current.surplus >= 0
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-orange-600 dark:text-orange-400'
                  }`}>Surplus</p>
                  <p className={`font-heading text-sm font-bold tabular-nums ${
                    current.surplus >= 0
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>
                    {current.surplus >= 0 ? '+' : ''}{formatIDRShort(current.surplus)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

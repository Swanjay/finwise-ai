'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatIDR, type Transaction } from '@/lib/finwise'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function formatDay(d: number) {
  return `${d}`
}

export function CashflowChart({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const data = useMemo(() => {
    const [yStr, mStr] = month.split('-')
    const year = Number(yStr)
    const monthIdx = Number(mStr) - 1
    const daysInMonth = getDaysInMonth(year, monthIdx)

    const dailyMap = new Map<number, { income: number; expense: number }>()
    for (let d = 1; d <= daysInMonth; d++) dailyMap.set(d, { income: 0, expense: 0 })

    for (const tx of transactions) {
      const txDate = new Date(tx.date)
      if (txDate.getFullYear() !== year || txDate.getMonth() !== monthIdx) continue
      const day = txDate.getDate()
      const entry = dailyMap.get(day)!
      if (tx.type === 'income' && tx.category !== 'transfer') {
        entry.income += tx.amount
      } else if (tx.type === 'expense' && tx.category !== 'transfer') {
        entry.expense += tx.amount
      }
    }

    // Build cumulative data for area chart
    let cumIncome = 0
    let cumExpense = 0
    const points: { day: string; income: number; expense: number }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const entry = dailyMap.get(d)!
      cumIncome += entry.income
      cumExpense += entry.expense
      points.push({ day: formatDay(d), income: cumIncome, expense: cumExpense })
    }
    return points
  }, [transactions, month])

  const hasData = data.some((d) => d.income > 0 || d.expense > 0)

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Belum ada data cashflow bulan ini 📊
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            tickLine={false}
            axisLine={false}
            interval={Math.ceil(data.length / 7) - 1}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#94A3B8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
              return `${v}`
            }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              fontSize: 12,
            }}
            formatter={(value, name) => [
              formatIDR(Number(value)),
              name === 'income' ? 'Pemasukan' : 'Pengeluaran',
            ]}
            labelFormatter={(label) => `Hari ke-${label}`}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#22C55E"
            strokeWidth={2}
            fill="url(#gradIncome)"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#gradExpense)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

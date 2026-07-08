'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface CashflowChartProps {
  transactions: { type: string; amount: number; date: string }[]
  className?: string
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CashflowChart({ transactions, className }: CashflowChartProps) {
  const data = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    startOfWeek.setHours(0, 0, 0, 0)

    const income = Array(7).fill(0)
    const expense = Array(7).fill(0)

    for (const t of transactions) {
      const d = new Date(t.date)
      const diff = Math.floor((d.getTime() - startOfWeek.getTime()) / 86400000)
      if (diff >= 0 && diff < 7) {
        if (t.type === 'income') income[diff] += t.amount
        else expense[diff] += t.amount
      }
    }

    const max = Math.max(...income, ...expense, 1)
    return DAYS.map((day, i) => ({
      day,
      incomeH: (income[i] / max) * 100,
      expenseH: (expense[i] / max) * 100,
    }))
  }, [transactions])

  return (
    <div className={cn('bg-card rounded-2xl p-4 border border-border shadow-sm', className)}>
      <h3 className="text-sm font-bold text-foreground mb-3">Cashflow This Week</h3>
      <div className="flex items-end gap-1.5 h-[100px] pb-2 border-b border-border">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '80px' }}>
              <div
                className="w-full rounded-t-md rounded-b-sm min-h-[4px] transition-all duration-300"
                style={{
                  height: `${d.incomeH}%`,
                  background: 'var(--chart-1, #D4A843)',
                  boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                }}
              />
              <div
                className="w-full rounded-t-md rounded-b-sm min-h-[4px] transition-all duration-300"
                style={{
                  height: `${d.expenseH}%`,
                  background: 'var(--chart-3, #A3514E)',
                  boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                }}
              />
            </div>
            <span className="text-[9px] font-semibold text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--chart-1, #D4A843)' }} />
          <span className="text-[10px] font-medium text-muted-foreground">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--chart-3, #A3514E)' }} />
          <span className="text-[10px] font-medium text-muted-foreground">Expense</span>
        </div>
      </div>
    </div>
  )
}

'use client'

import { cn } from '@/lib/utils'

interface AccountSummaryProps {
  totalBalance: number
  categories: { name: string; amount: number; color: string }[]
  className?: string
}

export function AccountSummary({ totalBalance, categories, className }: AccountSummaryProps) {
  const total = categories.reduce((sum, c) => sum + c.amount, 0) || 1

  const formatIDR = (n: number) => {
    if (n >= 1000000) return `Rp${(n / 1000000).toFixed(1)}jt`
    if (n >= 1000) return `Rp${(n / 1000).toFixed(0)}k`
    return `Rp${n.toLocaleString('id-ID')}`
  }

  // Build conic-gradient
  let accumulated = 0
  const gradientStops = categories.map((c) => {
    const start = accumulated
    const pct = (c.amount / total) * 100
    accumulated += pct
    return `${c.color} ${start}% ${accumulated}%`
  })

  return (
    <div className={cn('bg-card rounded-2xl p-4 border border-border shadow-sm', className)}>
      <h3 className="text-sm font-bold text-foreground mb-3">Account Summary</h3>

      <div className="relative w-[120px] h-[120px] mx-auto mb-3">
        <div
          className="w-full h-full rounded-full shadow-md"
          style={{ background: `conic-gradient(${gradientStops.join(', ')})` }}
        />
        <div className="absolute inset-[22px] rounded-full bg-card flex items-center justify-center">
          <span className="text-sm font-extrabold text-foreground">{formatIDR(totalBalance)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {categories.map((c) => (
          <div key={c.name} className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm shadow-sm" style={{ background: c.color }} />
              {c.name}
            </span>
            <span className="font-bold">{formatIDR(c.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { formatIDRShort, type Transaction, type Category, BUILTIN_CATEGORIES } from '@/lib/finwise'

export function TopSpending({
  transactions,
  allCategories,
}: {
  transactions: Transaction[]
  allCategories: Record<string, Category>
}) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.type !== 'expense' || tx.category === 'transfer') continue
      map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount)
    }
    return Array.from(map.entries())
      .map(([id, value]) => {
        const cat = allCategories[id] ?? BUILTIN_CATEGORIES[id] ?? { id, label: id, color: 'oklch(0.5 0.1 285)', type: 'expense' as const, icon: null }
        return { id, label: cat.label, color: cat.color, value }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [transactions, allCategories])

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Belum ada pengeluaran bulan ini 📝
      </div>
    )
  }

  const maxVal = data[0]?.value ?? 1

  return (
    <div className="flex flex-col gap-3">
      {data.map((item, i) => {
        const pct = Math.round((item.value / maxVal) * 100)
        return (
          <div key={item.id} className="flex items-center gap-3">
            <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#2D2057] truncate">{item.label}</span>
                <span className="text-xs font-semibold tabular-nums text-[#2D2057] ml-2 shrink-0">
                  {formatIDRShort(item.value)}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.color,
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

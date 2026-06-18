'use client'

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { formatIDR, type Category } from '@/lib/finwise'

interface Datum {
  category: Category
  value: number
}

export function SpendingDonut({
  data,
  total: totalProp,
}: {
  data: Datum[]
  total?: number
}) {
  const total = totalProp ?? data.reduce((s, d) => s + d.value, 0)
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
            nameKey="category.label"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.category.id} fill={d.category.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Total keluar</span>
        <span className="font-heading text-lg font-semibold tabular-nums">
          {formatIDR(total)}
        </span>
      </div>
    </div>
  )
}

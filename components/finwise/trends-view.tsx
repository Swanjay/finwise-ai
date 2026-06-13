'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import { formatIDRShort } from '@/lib/finwise'

// Illustrative 6-month trend
const DATA = [
  { month: 'Jan', income: 7500000, expense: 5200000 },
  { month: 'Feb', income: 7500000, expense: 4800000 },
  { month: 'Mar', income: 8200000, expense: 6100000 },
  { month: 'Apr', income: 7500000, expense: 5500000 },
  { month: 'Mei', income: 7800000, expense: 4900000 },
  { month: 'Jun', income: 7500000, expense: 1650000 },
]

export function TrendsView() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <TrendingUp className="size-4 text-primary" />
            Pemasukan vs Pengeluaran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA} barGap={4}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <Bar dataKey="income" fill="oklch(0.75 0.16 160)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="oklch(0.7 0.18 295)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs">
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

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Insights Otomatis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="rounded-xl bg-success/10 p-3 text-success">
            Bulan ini pengeluaranmu turun drastis — kerja bagus! Surplus tertinggi
            dalam 6 bulan.
          </p>
          <p className="rounded-xl bg-secondary p-3 text-muted-foreground">
            Rata-rata pengeluaran 6 bulan: {formatIDRShort(4691667)}/bulan.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

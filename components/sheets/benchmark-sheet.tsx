'use client'

import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { Button } from '@/components/ui/button'
import { summarize, spendingByCategory, BENCHMARK } from '@/lib/finwise'
import { cn } from '@/lib/utils'

function BenchmarkSheetContent({ onClose }: { onClose: () => void }) {
  const { transactions, allCategories, monthlyIncome } = useFinwise()
  const { expense } = summarize(transactions)
  const byCat = spendingByCategory(transactions, allCategories)

  return (
    <div className="flex flex-col gap-4 ">
      <p className="text-xs text-muted-foreground">Perbandingan pengeluaranmu dengan rata-rata Indonesia</p>
      {Object.entries(BENCHMARK).map(([catId, bench]) => {
        const spent = byCat.find((c) => c.category.id === catId)?.value ?? 0
        const yourPct = monthlyIncome > 0 ? Math.round((spent / monthlyIncome) * 100) : 0
        const diff = yourPct - bench.avgPct
        return (
          <div key={catId} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span>{bench.label}</span>
              <span className={cn('text-xs', diff > 5 ? 'text-destructive' : diff < -5 ? 'text-success' : 'text-muted-foreground')}>
                {diff > 0 ? `+${diff}%` : `${diff}%`} vs rata-rata
              </span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(yourPct, 100)}%` }} />
              </div>
              <span className="text-[10px] tabular-nums w-8 text-right">{yourPct}%</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-muted-foreground/50" style={{ width: `${bench.avgPct}%` }} />
              </div>
              <span className="text-[10px] tabular-nums w-8 text-right text-muted-foreground">{bench.avgPct}%</span>
            </div>
          </div>
        )
      })}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

export function BenchmarkSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Benchmark">
      <BenchmarkSheetContent onClose={onClose} />
    </BottomSheet>
  )
}

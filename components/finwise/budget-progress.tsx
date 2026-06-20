'use client'

import { formatIDRShort, BUILTIN_CATEGORIES, resolveCategory, type Category } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { cn } from '@/lib/utils'

export function BudgetProgress({ spentByCat }: { spentByCat: Map<string, number> }) {
  const { budgets, allCategories } = useFinwise()

  const activeBudgets = Object.keys(budgets).filter((id) => (budgets[id] ?? 0) > 0)

  if (activeBudgets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">Belum ada anggaran yang diatur 📝</p>
        <p className="text-xs text-muted-foreground">Buka Pengaturan untuk mengatur limit per kategori</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {activeBudgets.map((id) => {
        const limit = budgets[id] ?? 0
        const spent = spentByCat.get(id) ?? 0
        const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
        const over = spent > limit
        const near = pct >= 80 && !over
        const cat = resolveCategory(id, allCategories)
        if (!cat) return null
        const Icon = cat.icon

        return (
          <li key={id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Icon className="size-4 text-muted-foreground" /><span className="font-medium">{cat.label}</span></span>
              <span className={cn('tabular-nums text-xs', over ? 'text-destructive' : near ? 'text-warning' : 'text-muted-foreground')}>
                {formatIDRShort(spent)} / {formatIDRShort(limit)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full rounded-full transition-all', over ? 'bg-destructive' : near ? 'bg-warning' : 'bg-success')} style={{ width: `${pct}%` }} />
            </div>
            {over && <span className="text-xs text-destructive">Melebihi anggaran {formatIDRShort(spent - limit)}</span>}
          </li>
        )
      })}
    </ul>
  )
}

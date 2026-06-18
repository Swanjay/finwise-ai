'use client'

import { Trash2, MapPin } from 'lucide-react'
import { formatIDR, type Transaction } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { cn } from '@/lib/utils'

export function TransactionRow({
  tx,
  onDelete,
}: {
  tx: Transaction
  onDelete?: (id: string) => void
}) {
  const { allCategories } = useFinwise()
  const cat = allCategories[tx.category] ?? { label: tx.category, color: 'oklch(0.5 0.1 285)', icon: null }
  const Icon = cat.icon
  const income = tx.type === 'income'
  const date = new Date(tx.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <li className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/60">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 22%, transparent)` }}
        aria-hidden
      >
        {Icon ? <Icon className="size-5" style={{ color: cat.color }} /> : <span className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.description}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {cat.label} · {date}
          </span>
          {tx.tags && tx.tags.length > 0 && tx.tags.map((tag) => (
            <span key={tag} className="inline-block rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary">
              #{tag}
            </span>
          ))}
          {tx.location && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0 text-[10px] text-blue-600">
              <MapPin className="size-2.5" />
              {tx.location.name.length > 15 ? tx.location.name.slice(0, 15) + '...' : tx.location.name}
            </span>
          )}
        </div>
      </div>
      <span
        className={cn(
          'tabular-nums text-sm font-semibold',
          income ? 'text-success' : 'text-foreground',
        )}
      >
        {income ? '+' : '-'}
        {formatIDR(tx.amount)}
      </span>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(tx.id)}
          className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
          aria-label={`Hapus ${tx.description}`}
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  )
}

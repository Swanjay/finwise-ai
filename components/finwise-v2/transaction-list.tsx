'use client'

import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  date: string
  wallet?: string
}

interface TransactionListProps {
  transactions: Transaction[]
  onViewAll?: () => void
  className?: string
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    food: '🍜', transport: '🚗', shopping: '🛍️', entertainment: '🎬',
    health: '💊', education: '📚', bills: '🧾', salary: '💼',
    freelance: '💻', investment: '📈', gifts: '🎁', other: '📌',
  }
  return icons[category] || '📌'
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    food: 'var(--red-bg)', transport: 'var(--blue-bg)', shopping: 'var(--purple-bg)',
    entertainment: 'var(--amber-bg)', health: 'var(--green-bg)', education: 'var(--cyan-bg)',
    bills: 'var(--amber-bg)', salary: 'var(--green-bg)', freelance: 'var(--blue-bg)',
    investment: 'var(--purple-bg)', gifts: 'var(--rose-bg, #FEE2E2)', other: 'var(--muted)',
  }
  return colors[category] || 'var(--muted)'
}

export function TransactionList({ transactions, onViewAll, className }: TransactionListProps) {
  const formatIDR = (n: number) => {
    if (n >= 1000000) return `Rp${(n / 1000000).toFixed(1)}jt`
    if (n >= 1000) return `Rp${(n / 1000).toFixed(0)}k`
    return `Rp${n.toLocaleString('id-ID')}`
  }

  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const d = new Date(dateStr)
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return (
    <div className={cn('bg-card rounded-2xl p-4 border border-border shadow-sm', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Recent Transactions</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-xs font-semibold text-primary hover:underline">
            View All
          </button>
        )}
      </div>
      <div className="space-y-1">
        {transactions.slice(0, 5).map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-base shadow-sm"
              style={{ background: getCategoryColor(tx.category) }}
            >
              {getCategoryIcon(tx.category)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{tx.description}</p>
              <p className="text-[10px] text-muted-foreground">
                {timeAgo(tx.date)}{tx.wallet ? ` · ${tx.wallet}` : ''}
              </p>
            </div>
            <span className={cn(
              'text-sm font-extrabold tabular-nums',
              tx.type === 'income' ? 'text-green-600' : 'text-red-500'
            )}>
              {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

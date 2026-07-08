'use client'

import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatCard({ label, value, change, changeType = 'neutral', className }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-2xl p-4 bg-card border border-border shadow-sm',
      'transition-all duration-200 hover:shadow-md',
      className
    )}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xl font-extrabold text-foreground tracking-tight tabular-nums">
        {value}
      </p>
      {change && (
        <p className={cn(
          'text-[10px] font-semibold mt-1',
          changeType === 'up' && 'text-green-600',
          changeType === 'down' && 'text-red-500',
          changeType === 'neutral' && 'text-muted-foreground'
        )}>
          {change}
        </p>
      )}
    </div>
  )
}

interface StatGridProps {
  children: React.ReactNode
  className?: string
}

export function StatGrid({ children, className }: StatGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2.5', className)}>
      {children}
    </div>
  )
}

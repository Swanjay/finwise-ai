'use client'

import { useMemo } from 'react'
import { CalendarClock, Bell, ReceiptText } from 'lucide-react'
import { formatIDR, BUILTIN_CATEGORIES, resolveCategory, type RecurringItem, type Category } from '@/lib/finwise'

function getNextDueDate(frequency: string): Date {
  const now = new Date()
  const next = new Date(now)
  if (frequency === 'harian') {
    next.setDate(next.getDate() + 1)
  } else if (frequency === 'mingguan') {
    next.setDate(next.getDate() + 7)
  } else {
    // bulanan
    next.setMonth(next.getMonth() + 1)
    next.setDate(1)
  }
  return next
}

function daysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function UpcomingBills({
  recurring,
  allCategories,
}: {
  recurring: RecurringItem[]
  allCategories: Record<string, Category>
}) {
  const upcoming = useMemo(() => {
    return recurring
      .filter((r) => r.active)
      .map((r) => {
        const nextDue = getNextDueDate(r.frequency)
        const days = daysUntil(nextDue)
        const cat = resolveCategory(r.category, allCategories)
        return { ...r, nextDue, days, cat }
      })
      .filter((r) => r.days <= 7 && r.days >= 0)
      .sort((a, b) => a.days - b.days)
  }, [recurring, allCategories])

  if (recurring.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CalendarClock className="size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Belum ada tagihan berulang</p>
        <p className="text-xs text-muted-foreground/70">Atur di menu Berulang untuk melacak tagihan</p>
      </div>
    )
  }

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Bell className="size-8 text-green-500/60" />
        <p className="text-sm text-muted-foreground">Tidak ada tagihan dalam 7 hari ke depan ✨</p>
        <p className="text-xs text-muted-foreground/70">{recurring.filter(r => r.active).length} tagihan berulang aktif</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {upcoming.map((item) => {
        const Icon = item.cat?.icon ?? ReceiptText
        const label = item.cat?.label ?? item.category
        const color = item.cat?.color ?? 'oklch(0.5 0.1 285)'
        const dueLabel = item.days === 0 ? 'Hari ini' : item.days === 1 ? 'Besok' : `${item.days} hari lagi`

        return (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl p-2.5 bg-background/50 border border-border/30"
          >
            <div
              className="shrink-0 size-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
            >
              <Icon className="size-4" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{item.description || label}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{item.frequency}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-bold tabular-nums text-foreground">{formatIDR(item.amount)}</p>
              <p className={`text-[10px] font-semibold ${item.days <= 1 ? 'text-destructive' : item.days <= 3 ? 'text-warning' : 'text-muted-foreground'}`}>
                {dueLabel}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

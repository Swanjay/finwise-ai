'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Bell, Check, CheckCheck, Trash2, X, AlertTriangle, CalendarClock, BarChart3, Search } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import {
  generateAllNotifications,
  loadNotifications,
  saveNotifications,
  type AppNotification,
  type NotificationType,
} from '@/lib/smart-notifications'
import { cn } from '@/lib/utils'

// ─── Background notification generator (renders nothing visible) ───
export function SmartNotifications() {
  const { transactions, budgets, recurring, allCategories, monthlyIncome } = useFinwise()

  useEffect(() => {
    if (transactions.length === 0) return
    const timer = setTimeout(() => {
      generateAllNotifications(transactions, budgets, recurring, allCategories, monthlyIncome)
    }, 3000)
    return () => clearTimeout(timer)
  }, [transactions.length, budgets, recurring.length, allCategories, monthlyIncome])

  return null
}

// ─── Notification Bell (to be placed in header) ───
export function NotificationBell({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState(0)

  // Listen for storage changes to update count
  useEffect(() => {
    function update() {
      const notifs = loadNotifications()
      setCount(notifs.filter((n) => !n.read).length)
    }
    update()

    const interval = setInterval(update, 5000)
    window.addEventListener('storage', update)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', update)
    }
  }, [])

  return (
    <button
      onClick={onClick}
      aria-label={`Notifikasi${count > 0 ? ` (${count} baru)` : ''}`}
      className="relative flex size-9 items-center justify-center rounded-full bg-card text-muted-foreground shadow-md hover:text-primary transition"
      style={{ boxShadow: '0 4px 12px var(--theme-shadow, rgba(46,173,75,0.15))' }}
    >
      <Bell className="size-4" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none min-w-[18px] px-1 animate-pulse">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

// ─── Type config ───
const TYPE_CONFIG: Record<NotificationType, { label: string; color: string; bgColor: string }> = {
  budget_alert: { label: 'Anggaran', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  bill_reminder: { label: 'Tagihan', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  weekly_summary: { label: 'Ringkasan', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  unusual_spending: { label: 'Tidak Biasa', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins}m lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}h lalu`
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// ─── Notification Center Panel ───
export function NotificationCenter({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')
  const { transactions, budgets, recurring, allCategories, monthlyIncome } = useFinwise()

  // Load & generate on open
  useEffect(() => {
    const all = generateAllNotifications(transactions, budgets, recurring, allCategories, monthlyIncome)
    setNotifications(all)
  }, [transactions, budgets, recurring, allCategories, monthlyIncome])

  // Refresh on storage events
  useEffect(() => {
    function refresh() {
      setNotifications(loadNotifications())
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications
    return notifications.filter((n) => n.type === filter)
  }, [notifications, filter])

  const unreadCount = notifications.filter((n) => !n.read).length

  function markRead(id: string) {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    setNotifications(updated)
    saveNotifications(updated)
  }

  function markAllRead() {
    const updated = notifications.map((n) => ({ ...n, read: true }))
    setNotifications(updated)
    saveNotifications(updated)
  }

  function clearAll() {
    setNotifications([])
    saveNotifications([])
  }

  function deleteNotification(id: string) {
    const updated = notifications.filter((n) => n.id !== id)
    setNotifications(updated)
    saveNotifications(updated)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {unreadCount} baru
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10 transition"
            >
              <CheckCheck className="size-3" /> Baca Semua
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/10 transition"
            >
              <Trash2 className="size-3" /> Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'all' as const, label: 'Semua' },
          { id: 'budget_alert' as const, label: '💰 Anggaran' },
          { id: 'bill_reminder' as const, label: '📅 Tagihan' },
          { id: 'weekly_summary' as const, label: '📊 Ringkasan' },
          { id: 'unusual_spending' as const, label: '🔍 Tidak Biasa' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition',
              filter === f.id
                ? 'bg-primary text-white'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Bell className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
          <p className="text-xs text-muted-foreground/60">
            Notifikasi akan muncul saat ada peringatan budget, tagihan, atau pola pengeluaran
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto">
          {filtered.map((notif) => {
            const config = TYPE_CONFIG[notif.type]
            return (
              <div
                key={notif.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl p-3 transition-all border',
                  notif.read
                    ? 'bg-background/50 border-border/20 opacity-70'
                    : 'bg-background border-primary/20 shadow-sm',
                )}
                onClick={() => !notif.read && markRead(notif.id)}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'shrink-0 flex size-9 items-center justify-center rounded-lg text-base',
                    config.bgColor,
                  )}
                >
                  {notif.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className={cn('text-xs font-bold truncate', notif.read ? 'text-muted-foreground' : 'text-foreground')}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="shrink-0 size-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {notif.body}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn('text-[9px] font-semibold uppercase tracking-wider', config.color)}>
                      {config.label}
                    </span>
                    <span className="text-[9px] text-muted-foreground/50">
                      {timeAgo(notif.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  {!notif.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(notif.id) }}
                      aria-label="Tandai sudah dibaca"
                      className="rounded-full p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
                    >
                      <Check className="size-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id) }}
                    aria-label="Hapus notifikasi"
                    className="rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Permission button */}
      <RequestNotificationButton />

      {/* Footer */}
      <div className="rounded-xl bg-muted/50 p-3">
        <p className="text-[10px] text-muted-foreground text-center">
          💡 Notifikasi disimpan lokal di browser. Maksimal 50 notifikasi.
        </p>
      </div>
    </div>
  )
}

// ─── Manual permission request button ───
export function RequestNotificationButton() {
  async function requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser kamu tidak mendukung notifikasi')
      return
    }

    const result = await Notification.requestPermission()
    if (result === 'granted') {
      new Notification('🐱 FinWise Notifikasi Aktif!', {
        body: 'Kamu akan dapat peringatan budget, tagihan, dan pola pengeluaran.',
        icon: '/mascot-cat-192.png?v=3',
        tag: 'finwise-welcome',
      })
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-xs text-success">
        <span>🔔</span> Notifikasi browser aktif
      </div>
    )
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertTriangle className="size-3.5" />
        Notifikasi diblokir. Aktifkan di pengaturan browser.
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={requestPermission}
      className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-xs hover:bg-secondary transition"
    >
      <span>🔔</span>
      <span>Aktifkan Notifikasi Browser</span>
    </button>
  )
}

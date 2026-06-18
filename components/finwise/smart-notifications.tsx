'use client'

import { useEffect, useCallback } from 'react'
import { useFinwise } from '@/components/finwise-store'
import { BUILTIN_CATEGORIES, filterByMonth, getMonthKey, formatIDR } from '@/lib/finwise'

// Notification permission + budget alerts
export function SmartNotifications() {
  const { transactions, budgets } = useFinwise()

  const checkBudgetAlerts = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const now = new Date()
    const monthKey = getMonthKey(now)
    const monthTx = filterByMonth(transactions, monthKey)

    for (const [catId, budget] of Object.entries(budgets)) {
      if (!budget || budget <= 0) continue
      const spent = monthTx
        .filter((t) => t.type === 'expense' && t.category === catId)
        .reduce((s, t) => s + t.amount, 0)
      
      const pct = spent / budget
      const catLabel = BUILTIN_CATEGORIES[catId]?.label ?? catId

      if (pct >= 0.9 && pct < 1) {
        // 90% warning
        new Notification('⚠️ Budget Hampir Habis', {
          body: `${catLabel}: ${formatIDR(spent)} dari ${formatIDR(budget)} (${Math.round(pct * 100)}%)`,
          icon: '/mascot-cat-192.png',
          tag: `budget-warn-${catId}`,
          requireInteraction: false,
        })
      } else if (pct >= 1) {
        // Over budget
        new Notification('🚨 Budget Terlampaui!', {
          body: `${catLabel}: ${formatIDR(spent)} — melebihi budget ${formatIDR(budget)}`,
          icon: '/mascot-cat-192.png',
          tag: `budget-over-${catId}`,
          requireInteraction: true,
        })
      }
    }
  }, [transactions, budgets])

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      // Don't auto-request — wait for user action
    }
  }, [])

  // Check budget alerts when transactions change
  useEffect(() => {
    if (transactions.length === 0) return
    const timer = setTimeout(checkBudgetAlerts, 2000)
    return () => clearTimeout(timer)
  }, [transactions.length, checkBudgetAlerts])

  return null
}

// Manual permission request button
export function RequestNotificationButton() {
  const { transactions, budgets } = useFinwise()

  async function requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser kamu tidak mendukung notifikasi')
      return
    }

    const result = await Notification.requestPermission()
    if (result === 'granted') {
      // Send a test notification
      new Notification('🐱 FinWise Notifikasi Aktif!', {
        body: 'Kamu akan dapat peringatan kalau budget hampir habis.',
        icon: '/mascot-cat-192.png',
        tag: 'finwise-welcome',
      })
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
        <span>🔔</span> Notifikasi aktif
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={requestPermission}
      className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm hover:bg-secondary transition"
    >
      <span>🔔</span>
      <span>Aktifkan Notifikasi Budget</span>
    </button>
  )
}

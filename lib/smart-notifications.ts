import {
  BUILTIN_CATEGORIES,
  filterByMonth,
  getMonthKey,
  formatIDR,
  summarize,
  resolveCategory,
  type Transaction,
  type RecurringItem,
  type Category,
} from '@/lib/finwise'

// ─── Types ───
export type NotificationType = 'budget_alert' | 'bill_reminder' | 'weekly_summary' | 'unusual_spending'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  icon: string
  read: boolean
  timestamp: number
  meta?: Record<string, unknown>
}

// ─── Storage ───
const STORAGE_KEY = 'fw.notifications.v1'

export function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveNotifications(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  } catch { /* ignore */ }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Deduplicate: avoid creating the same notification twice in one session
function dedupeKey(type: NotificationType, metaKey: string): string {
  return `${type}:${metaKey}`
}

// ─── 1. Budget Alerts (80% threshold) ───
export function generateBudgetAlerts(
  transactions: Transaction[],
  budgets: Partial<Record<string, number>>,
  existingKeys: Set<string>,
): AppNotification[] {
  const now = new Date()
  const monthKey = getMonthKey(now)
  const monthTx = filterByMonth(transactions, monthKey)
  const results: AppNotification[] = []

  for (const [catId, budget] of Object.entries(budgets)) {
    if (!budget || budget <= 0) continue
    const spent = monthTx
      .filter((t) => t.type === 'expense' && t.category === catId)
      .reduce((s, t) => s + t.amount, 0)

    const pct = spent / budget
    const catLabel = BUILTIN_CATEGORIES[catId]?.label ?? catId

    if (pct >= 1) {
      const key = dedupeKey('budget_alert', `over-${catId}-${monthKey}`)
      if (!existingKeys.has(key)) {
        results.push({
          id: generateId(),
          type: 'budget_alert',
          title: '🚨 Budget Terlampaui!',
          body: `${catLabel}: ${formatIDR(spent)} — melebihi budget ${formatIDR(budget)} (${Math.round(pct * 100)}%)`,
          icon: '🚨',
          read: false,
          timestamp: Date.now(),
          meta: { key, catId, pct, spent, budget },
        })
      }
    } else if (pct >= 0.8) {
      const key = dedupeKey('budget_alert', `warn-${catId}-${monthKey}`)
      if (!existingKeys.has(key)) {
        results.push({
          id: generateId(),
          type: 'budget_alert',
          title: '⚠️ Budget Hampir Habis',
          body: `${catLabel}: ${formatIDR(spent)} dari ${formatIDR(budget)} (${Math.round(pct * 100)}%)`,
          icon: '⚠️',
          read: false,
          timestamp: Date.now(),
          meta: { key, catId, pct, spent, budget },
        })
      }
    }
  }

  return results
}

// ─── 2. Bill Reminders (3 days, 1 day, today) ───
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

export function generateBillReminders(
  recurring: RecurringItem[],
  allCategories: Record<string, Category>,
  existingKeys: Set<string>,
): AppNotification[] {
  const results: AppNotification[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const r of recurring) {
    if (!r.active) continue
    const nextDue = getNextDueDate(r.frequency)
    const days = daysUntil(nextDue)
    const cat = resolveCategory(r.category, allCategories)
    const label = cat?.label ?? r.category
    const desc = r.description || label

    if (days === 0) {
      const key = dedupeKey('bill_reminder', `today-${r.id}-${today}`)
      if (!existingKeys.has(key)) {
        results.push({
          id: generateId(),
          type: 'bill_reminder',
          title: '🔴 Tagihan Jatuh Tempo Hari Ini!',
          body: `${desc} — ${formatIDR(r.amount)}`,
          icon: '🔴',
          read: false,
          timestamp: Date.now(),
          meta: { key, recurringId: r.id, days: 0 },
        })
      }
    } else if (days === 1) {
      const key = dedupeKey('bill_reminder', `1day-${r.id}-${today}`)
      if (!existingKeys.has(key)) {
        results.push({
          id: generateId(),
          type: 'bill_reminder',
          title: '🟠 Tagihan Besok',
          body: `${desc} — ${formatIDR(r.amount)}. Jangan lupa siapkan dana!`,
          icon: '🟠',
          read: false,
          timestamp: Date.now(),
          meta: { key, recurringId: r.id, days: 1 },
        })
      }
    } else if (days === 3) {
      const key = dedupeKey('bill_reminder', `3day-${r.id}-${today}`)
      if (!existingKeys.has(key)) {
        results.push({
          id: generateId(),
          type: 'bill_reminder',
          title: '🟡 Tagihan 3 Hari Lagi',
          body: `${desc} — ${formatIDR(r.amount)}`,
          icon: '🟡',
          read: false,
          timestamp: Date.now(),
          meta: { key, recurringId: r.id, days: 3 },
        })
      }
    }
  }

  return results
}

// ─── 3. Weekly Summary (every Monday) ───
export function generateWeeklySummary(
  transactions: Transaction[],
  monthlyIncome: number,
  allCategories: Record<string, Category>,
  existingKeys: Set<string>,
): AppNotification[] {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon
  if (dayOfWeek !== 1) return []

  const weekKey = now.toISOString().slice(0, 10) // unique per Monday
  const key = dedupeKey('weekly_summary', weekKey)
  if (existingKeys.has(key)) return []

  // Get last 7 days of transactions
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekTx = transactions.filter((t) => {
    const d = new Date(t.date)
    return d >= weekAgo && d <= now
  })

  if (weekTx.length === 0) return []

  const { income, expense, surplus } = summarize(weekTx)

  // Find top spending category
  const catSpend: Record<string, number> = {}
  for (const t of weekTx) {
    if (t.type === 'expense') {
      catSpend[t.category] = (catSpend[t.category] || 0) + t.amount
    }
  }
  const topCatId = Object.entries(catSpend).sort(([, a], [, b]) => b - a)[0]?.[0]
  const topCatLabel = topCatId ? (resolveCategory(topCatId, allCategories)?.label ?? topCatId) : '-'
  const topCatAmount = topCatId ? catSpend[topCatId] : 0

  const savingRate = income > 0 ? Math.round((surplus / income) * 100) : 0

  return [{
    id: generateId(),
    type: 'weekly_summary',
    title: '📊 Ringkasan Mingguan',
    body: `Pengeluaran: ${formatIDR(expense)} · Top: ${topCatLabel} (${formatIDR(topCatAmount)}) · Saving rate: ${savingRate}%`,
    icon: '📊',
    read: false,
    timestamp: Date.now(),
    meta: { key, income, expense, surplus, topCatLabel, topCatAmount, savingRate },
  }]
}

// ─── 4. Unusual Spending Detection (2x+ average) ───
export function detectUnusualSpending(
  transactions: Transaction[],
  allCategories: Record<string, Category>,
  existingKeys: Set<string>,
): AppNotification[] {
  const results: AppNotification[] = []
  if (transactions.length < 2) return results

  // Calculate average per category (all time for now, recent 3 months preferred)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const catAmounts: Record<string, number[]> = {}
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    if (!catAmounts[t.category]) catAmounts[t.category] = []
    catAmounts[t.category].push(t.amount)
  }

  // Check recent transactions (last 7 days) against category average
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const recentTx = transactions.filter(
    (t) => t.type === 'expense' && new Date(t.date) >= weekAgo,
  )

  for (const tx of recentTx) {
    const amounts = catAmounts[tx.category]
    if (!amounts || amounts.length < 3) continue // need at least 3 data points

    // Calculate average excluding this transaction
    const others = amounts.filter((a) => a !== tx.amount)
    if (others.length < 2) continue
    const avg = others.reduce((s, a) => s + a, 0) / others.length

    if (tx.amount >= avg * 2 && avg > 0) {
      const key = dedupeKey('unusual_spending', tx.id)
      if (!existingKeys.has(key)) {
        const catLabel = resolveCategory(tx.category, allCategories)?.label ?? tx.category
        const multiplier = Math.round((tx.amount / avg) * 10) / 10
        results.push({
          id: generateId(),
          type: 'unusual_spending',
          title: '🔍 Pengeluaran Tidak Biasa',
          body: `${tx.description}: ${formatIDR(tx.amount)} — ${multiplier}x rata-rata ${catLabel} (${formatIDR(Math.round(avg))})`,
          icon: '🔍',
          read: false,
          timestamp: Date.now(),
          meta: { key, txId: tx.id, amount: tx.amount, avg, multiplier, category: tx.category },
        })
      }
    }
  }

  return results
}

// ─── Aggregate: Generate all notifications ───
export function generateAllNotifications(
  transactions: Transaction[],
  budgets: Partial<Record<string, number>>,
  recurring: RecurringItem[],
  allCategories: Record<string, Category>,
  monthlyIncome: number,
): AppNotification[] {
  const existing = loadNotifications()
  const existingKeys = new Set(
    existing.map((n) => n.meta?.key as string).filter(Boolean),
  )

  const budgetAlerts = generateBudgetAlerts(transactions, budgets, existingKeys)
  const billReminders = generateBillReminders(recurring, allCategories, existingKeys)
  const weeklySummary = generateWeeklySummary(transactions, monthlyIncome, allCategories, existingKeys)
  const unusualSpending = detectUnusualSpending(transactions, allCategories, existingKeys)

  const newNotifications = [...budgetAlerts, ...billReminders, ...weeklySummary, ...unusualSpending]

  if (newNotifications.length === 0) return existing

  const merged = [...newNotifications, ...existing]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50) // keep max 50

  saveNotifications(merged)
  return merged
}

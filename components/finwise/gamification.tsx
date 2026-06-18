'use client'

import { useEffect, useState, useCallback } from 'react'
import { useFinwise } from '@/components/finwise-store'
import { filterByMonth, getMonthKey } from '@/lib/finwise'

// ─── Types ───
export interface UserStats {
  level: number
  xp: number
  xpToNext: number
  streak: number
  totalTransactions: number
  totalScans: number
  perfectBudgetMonths: number
  badges: Badge[]
}

export interface Badge {
  id: string
  name: string
  emoji: string
  description: string
  unlocked: boolean
  unlockedAt?: string
  progress: number
  target: number
}

const STORAGE_KEY = 'fw.gamification.v1'

// XP rewards
const XP_TRANSACTION = 10
const XP_SCAN = 25
const XP_BUDGET_PERFECT = 100
const XP_STREAK_DAY = 5
const XP_TAG_USE = 3

// Level thresholds (XP needed per level)
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

// Badge definitions
const BADGE_DEFINITIONS: Omit<Badge, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
  { id: 'first_tx', name: 'Langkah Pertama', emoji: '👣', description: 'Catat transaksi pertama', target: 1 },
  { id: 'tx_10', name: 'Pencatat Rajin', emoji: '📝', description: 'Catat 10 transaksi', target: 10 },
  { id: 'tx_50', name: 'Akuntan Muda', emoji: '📊', description: 'Catat 50 transaksi', target: 50 },
  { id: 'tx_100', name: 'Master Keuangan', emoji: '🏆', description: 'Catat 100 transaksi', target: 100 },
  { id: 'tx_500', name: 'Legenda Finansial', emoji: '👑', description: 'Catat 500 transaksi', target: 500 },
  { id: 'scan_5', name: 'Scanner Handal', emoji: '📸', description: 'Scan 5 struk', target: 5 },
  { id: 'scan_25', name: 'Raja Struk', emoji: '🎯', description: 'Scan 25 struk', target: 25 },
  { id: 'streak_3', name: 'Konsisten 3 Hari', emoji: '🔥', description: 'Streak 3 hari berturut-turut', target: 3 },
  { id: 'streak_7', name: 'Streak Champion', emoji: '⚡', description: 'Streak 7 hari berturut-turut', target: 7 },
  { id: 'streak_30', name: 'Tidak Terhentikan', emoji: '💎', description: 'Streak 30 hari berturut-turut', target: 30 },
  { id: 'budget_perfect', name: 'Budget Master', emoji: '🎯', description: 'Sesuai budget 1 bulan penuh', target: 1 },
  { id: 'budget_3', name: 'Budget Pro', emoji: '📈', description: 'Sesuai budget 3 bulan berturut-turut', target: 3 },
  { id: 'saver', name: 'Hemat Champion', emoji: '💰', description: 'Surplus 3 bulan berturut-turut', target: 3 },
  { id: 'tagger', name: 'Tag Master', emoji: '🏷️', description: 'Gunakan 10 tag berbeda', target: 10 },
  { id: 'level_5', name: 'Rising Star', emoji: '⭐', description: 'Capai level 5', target: 5 },
  { id: 'level_10', name: 'FinWise Legend', emoji: '🌟', description: 'Capai level 10', target: 10 },
]

interface StoredStats {
  xp: number
  level: number
  streak: number
  lastActiveDate: string
  totalTransactions: number
  totalScans: number
  perfectBudgetMonths: number
  badges: Record<string, { unlocked: boolean; unlockedAt?: string; progress: number }>
  surplusMonths: number
  tagCount: number
}

function loadStats(): StoredStats {
  if (typeof window === 'undefined') return getDefaultStats()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : getDefaultStats()
  } catch {
    return getDefaultStats()
  }
}

function getDefaultStats(): StoredStats {
  return {
    xp: 0, level: 1, streak: 0, lastActiveDate: '',
    totalTransactions: 0, totalScans: 0, perfectBudgetMonths: 0,
    badges: {}, surplusMonths: 0, tagCount: 0,
  }
}

function saveStats(stats: StoredStats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)) } catch {}
}

// ─── Hook ───
export function useGamification() {
  const { transactions, budgets, allCategories, tags } = useFinwise()
  const [stats, setStats] = useState<StoredStats>(getDefaultStats())
  const [loaded, setLoaded] = useState(false)
  const [newBadge, setNewBadge] = useState<Badge | null>(null)

  // Load stats
  useEffect(() => {
    setStats(loadStats())
    setLoaded(true)
  }, [])

  // Update streak on load
  useEffect(() => {
    if (!loaded) return
    setStats((prev) => {
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      
      if (prev.lastActiveDate === today) return prev
      
      let newStreak = prev.streak
      if (prev.lastActiveDate === yesterday) {
        newStreak = prev.streak + 1
      } else if (prev.lastActiveDate !== today) {
        newStreak = 1
      }
      
      return { ...prev, streak: newStreak, lastActiveDate: today }
    })
  }, [loaded])

  // Award XP for transactions
  const awardXP = useCallback((amount: number, reason: string) => {
    setStats((prev) => {
      let newXP = prev.xp + amount
      let newLevel = prev.level
      
      while (newXP >= xpForLevel(newLevel)) {
        newXP -= xpForLevel(newLevel)
        newLevel++
      }
      
      const next = { ...prev, xp: newXP, level: newLevel }
      saveStats(next)
      return next
    })
  }, [])

  // Check and update badges
  const checkBadges = useCallback(() => {
    setStats((prev) => {
      const updated = { ...prev }
      let hasNew = false
      
      // Transaction count badges
      const txCount = transactions.length
      updated.totalTransactions = txCount
      
      const checkBadge = (id: string, progress: number) => {
        const def = BADGE_DEFINITIONS.find(b => b.id === id)
        if (!def) return
        if (!updated.badges[id]) updated.badges[id] = { unlocked: false, progress: 0 }
        updated.badges[id].progress = Math.min(progress, def.target)
        if (progress >= def.target && !updated.badges[id].unlocked) {
          updated.badges[id].unlocked = true
          updated.badges[id].unlockedAt = new Date().toISOString()
          hasNew = true
          setNewBadge({ ...def, unlocked: true, unlockedAt: new Date().toISOString(), progress: def.target, target: def.target })
        }
      }
      
      checkBadge('first_tx', txCount)
      checkBadge('tx_10', txCount)
      checkBadge('tx_50', txCount)
      checkBadge('tx_100', txCount)
      checkBadge('tx_500', txCount)
      
      // Streak badges
      checkBadge('streak_3', prev.streak)
      checkBadge('streak_7', prev.streak)
      checkBadge('streak_30', prev.streak)
      
      // Scan badges
      checkBadge('scan_5', prev.totalScans)
      checkBadge('scan_25', prev.totalScans)
      
      // Budget perfect month
      const now = new Date()
      const monthKey = getMonthKey(now)
      const monthTx = filterByMonth(transactions, monthKey)
      let isPerfect = true
      for (const [catId, budget] of Object.entries(budgets)) {
        if (!budget || budget <= 0) continue
        const spent = monthTx.filter(t => t.type === 'expense' && t.category === catId).reduce((s, t) => s + t.amount, 0)
        if (spent > budget) { isPerfect = false; break }
      }
      if (isPerfect && Object.keys(budgets).some(k => budgets[k] && budgets[k] > 0)) {
        updated.perfectBudgetMonths = Math.max(updated.perfectBudgetMonths, 1)
      }
      checkBadge('budget_perfect', updated.perfectBudgetMonths)
      checkBadge('budget_3', updated.perfectBudgetMonths)
      
      // Tag badges
      updated.tagCount = tags.length
      checkBadge('tagger', tags.length)
      
      // Level badges
      checkBadge('level_5', prev.level)
      checkBadge('level_10', prev.level)
      
      // Surplus months
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      if (income > expense && income > 0) {
        updated.surplusMonths = Math.max(updated.surplusMonths, 1)
      }
      checkBadge('saver', updated.surplusMonths)
      
      saveStats(updated)
      return updated
    })
  }, [transactions, budgets, tags])

  // Check badges when data changes
  useEffect(() => {
    if (!loaded || transactions.length === 0) return
    checkBadges()
  }, [loaded, transactions.length, budgets, tags.length, checkBadges])

  // Build badges array
  const badges: Badge[] = BADGE_DEFINITIONS.map((def) => {
    const stored = stats.badges[def.id]
    return {
      ...def,
      unlocked: stored?.unlocked ?? false,
      unlockedAt: stored?.unlockedAt,
      progress: stored?.progress ?? 0,
      target: def.target,
    }
  })

  const userStats: UserStats = {
    level: stats.level,
    xp: stats.xp,
    xpToNext: xpForLevel(stats.level),
    streak: stats.streak,
    totalTransactions: stats.totalTransactions,
    totalScans: stats.totalScans,
    perfectBudgetMonths: stats.perfectBudgetMonths,
    badges,
  }

  return { stats: userStats, awardXP, newBadge, clearNewBadge: () => setNewBadge(null) }
}

// ─── Components ───
export function LevelBadge({ stats }: { stats: UserStats }) {
  const pct = Math.round((stats.xp / stats.xpToNext) * 100)
  
  return (
    <div className="clay-card flex items-center gap-3 p-3">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-2xl">
        🏆
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">Lv.{stats.level}</span>
          <span className="text-xs text-muted-foreground">{stats.xp}/{stats.xpToNext} XP</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {stats.streak > 0 && (
        <div className="flex flex-col items-center">
          <span className="text-lg">🔥</span>
          <span className="text-xs font-bold text-primary">{stats.streak}</span>
        </div>
      )}
    </div>
  )
}

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  const unlocked = badges.filter(b => b.unlocked)
  const locked = badges.filter(b => !b.unlocked)
  
  return (
    <div className="flex flex-col gap-3">
      {unlocked.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Terbuka ({unlocked.length}/{badges.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {unlocked.map((badge) => (
              <div key={badge.id} className="clay-card flex flex-col items-center gap-1 p-2.5 text-center">
                <span className="text-2xl">{badge.emoji}</span>
                <span className="text-[11px] font-semibold leading-tight">{badge.name}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{badge.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {locked.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Belum Terbuka ({locked.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {locked.map((badge) => (
              <div key={badge.id} className="clay-card flex flex-col items-center gap-1 p-2.5 text-center opacity-50">
                <span className="text-2xl grayscale">{badge.emoji}</span>
                <span className="text-[11px] font-semibold leading-tight">{badge.name}</span>
                <div className="w-full">
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round((badge.progress / badge.target) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{badge.progress}/{badge.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function BadgeUnlockToast({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className="fixed inset-x-0 top-4 z-[9999] mx-auto max-w-[340px] animate-bounce"
    >
      <div className="clay-card flex items-center gap-3 border-2 border-primary p-3 shadow-lg">
        <span className="text-3xl">{badge.emoji}</span>
        <div>
          <p className="text-sm font-bold text-primary">Badge Unlocked!</p>
          <p className="text-xs">{badge.name}</p>
          <p className="text-[10px] text-muted-foreground">{badge.description}</p>
        </div>
        <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
      </div>
    </div>
  )
}

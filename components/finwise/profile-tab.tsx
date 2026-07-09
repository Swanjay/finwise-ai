'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCircle, Settings, CreditCard, Wallet, Repeat, Download, Upload, Mic, BarChart3,
  ChevronRight, Plus, X, Moon, Sun, Smartphone, Lock, Trash2, Cloud, Check,
  TrendingUp, Heart, Users, Ticket, LogOut, Shield, Crown, Eye, EyeOff,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useFinwise } from '@/components/finwise-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatIDR, filterByMonth, getMonthKey, generateId } from '@/lib/finwise'
import { getPlanInfo, canAccess } from '@/lib/plans'
import { cn } from '@/lib/utils'

// ─── Types ───
interface HouseholdMember {
  id: string
  name: string
  role: 'suami' | 'istri' | 'anak' | 'lainnya'
  color: string
}

interface ProfileTabProps {
  onOpenSheet: (sheet: string) => void
}

// ─── Constants ───
const MEMBER_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#EF4444']

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  suami: { label: 'Suami', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  istri: { label: 'Istri', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  anak: { label: 'Anak', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  lainnya: { label: 'Lainnya', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
}

const QUICK_ACTIONS = [
  { emoji: '💳', label: 'Kartu Saya', sheet: 'cards' },
  { emoji: '💰', label: 'Budget 50/30/20', sheet: 'smart-budget' },
  { emoji: '🏠', label: 'Dompet', sheet: 'wallets' },
  { emoji: '🔄', label: 'Transaksi Berulang', sheet: 'recurring' },
  { emoji: '📥', label: 'Import Bank', sheet: 'import' },
  { emoji: '📤', label: 'Export Laporan', sheet: 'export' },
  { emoji: '🎤', label: 'Input Suara', sheet: 'voice' },
  { emoji: '📊', label: 'Benchmark', sheet: 'benchmark' },
]

// ─── Animation variants ───
const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' as const },
  }),
}

// ─── Health Gauge (SVG) ───
function HealthGauge({ score }: { score: number }) {
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(1, Math.max(0, score / 100))
  const dashOffset = circumference * (1 - progress)

  const color =
    score >= 80 ? '#22C55E' :
    score >= 60 ? '#3B82F6' :
    score >= 40 ? '#F59E0B' : '#EF4444'

  const label =
    score >= 80 ? 'Sangat Sehat' :
    score >= 60 ? 'Sehat' :
    score >= 40 ? 'Perlu Perhatian' : 'Kritis'

  return (
    <div className="relative flex items-center justify-center">
      <svg width="124" height="124" viewBox="0 0 124 124" className="drop-shadow-sm">
        <circle
          cx="62" cy="62" r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted/20"
          strokeWidth="10"
        />
        <circle
          cx="62" cy="62" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 62 62)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-0.5">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
      </div>
    </div>
  )
}

// ─── Toggle Switch ───
function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          checked ? 'bg-primary' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'inline-block size-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}

// ─── Main Profile Tab ───
export function ProfileTab({ onOpenSheet }: ProfileTabProps) {
  const { data: session } = useSession()
  const store = useFinwise()
  const {
    transactions, budgets, cards, monthlyIncome, plan,
    theme, toggleTheme, fontSize, setFontSize,
    compactMode, toggleCompactMode, pin, hideBalance,
    householdMembers, addHouseholdMember, removeHouseholdMember,
    getCardLimitUsage, resetAll, syncNow,
  } = store

  const user = session?.user
  const planInfo = getPlanInfo()

  // ─── Household state ───
  const [showAddMember, setShowAddMember] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<'suami' | 'istri' | 'anak' | 'lainnya'>('suami')

  // ─── Financial Health Score ───
  const healthData = useMemo(() => {
    const currentMonthKey = getMonthKey(new Date())
    const monthTx = filterByMonth(transactions, currentMonthKey)
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

    // 1. Budget adherence (0-25)
    const expenseTx = monthTx.filter(t => t.type === 'expense' && t.category !== 'transfer')
    const spentMap = new Map<string, number>()
    for (const t of expenseTx) {
      spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount)
    }
    const budgetEntries = Object.entries(budgets).filter((entry) => (entry[1] ?? 0) > 0)
    let budgetScore = 12.5
    let budgetPct = 50
    if (budgetEntries.length > 0) {
      const withinBudget = budgetEntries.filter(([cat, limit]) => (spentMap.get(cat) ?? 0) <= (limit ?? 0)).length
      budgetPct = Math.round((withinBudget / budgetEntries.length) * 100)
      budgetScore = (withinBudget / budgetEntries.length) * 25
    }

    // 2. Savings rate (0-25)
    const income = monthTx.filter(t => t.type === 'income' && t.category !== 'transfer').reduce((s, t) => s + t.amount, 0)
    const expense = expenseTx.reduce((s, t) => s + t.amount, 0)
    let savingsRate = 0
    let savingsScore = 12.5
    if (income > 0) {
      savingsRate = Math.round(((income - expense) / income) * 100)
      const rate = (income - expense) / income
      if (rate >= 0.2) savingsScore = 25
      else if (rate >= 0.1) savingsScore = 20
      else if (rate >= 0) savingsScore = 15
      else savingsScore = Math.max(0, 10 + rate * 50)
    }

    // 3. Debt ratio (0-25)
    const creditCards = cards.filter(c => c.type === 'credit' && c.limit && c.limit > 0)
    let debtScore = 25
    if (creditCards.length > 0) {
      const totalLimit = creditCards.reduce((s, c) => s + (c.limit ?? 0), 0)
      const totalUsed = creditCards.reduce((s, c) => s + getCardLimitUsage(c.id), 0)
      const ratio = totalLimit > 0 ? totalUsed / totalLimit : 0
      if (ratio <= 0.3) debtScore = 25
      else if (ratio <= 0.5) debtScore = 20
      else if (ratio <= 0.7) debtScore = 15
      else if (ratio <= 0.9) debtScore = 10
      else debtScore = 5
    }

    // 4. Consistency (0-25)
    const uniqueDays = new Set(monthTx.map(t => t.date.slice(8, 10))).size
    const consistencyScore = Math.min(25, (uniqueDays / Math.max(1, daysInMonth)) * 25 * 2)

    const totalScore = Math.round(budgetScore + savingsScore + debtScore + consistencyScore)

    return {
      score: Math.min(100, Math.max(0, totalScore)),
      savingsRate,
      daysTracked: uniqueDays,
      budgetPct,
    }
  }, [transactions, budgets, cards, getCardLimitUsage])

  // ─── Plan display helpers ───
  const planLabel = plan === 'basic' ? 'Basic' : plan === 'pro' ? 'Pro' : 'Premium'
  const planEmoji = plan === 'basic' ? '🆓' : plan === 'pro' ? '💎' : '👑'
  const planBadgeClass =
    plan === 'basic'
      ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
      : plan === 'pro'
        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'

  // ─── Days until expiry ───
  const daysUntilExpiry = useMemo(() => {
    if (plan === 'basic' || !planInfo.expiresAt) return null
    const expiry = new Date(planInfo.expiresAt)
    return Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }, [plan, planInfo.expiresAt])

  // ─── Add household member ───
  function handleAddMember() {
    if (!newName.trim()) return
    const member: HouseholdMember = {
      id: generateId(),
      name: newName.trim(),
      role: newRole,
      color: MEMBER_COLORS[householdMembers.length % MEMBER_COLORS.length],
    }
    addHouseholdMember(member)
    setNewName('')
    setShowAddMember(false)
  }

  // ─── Clear data confirmation ───
  function handleClearData() {
    if (confirm('⚠️ PERINGATAN!\n\nIni akan menghapus SEMUA data transaksi, wallet, budget, dan pengaturan.\n\nAksi ini TIDAK bisa dibatalkan.\n\nLanjutkan?')) {
      resetAll()
    }
  }

  // ─── Initials from name ───
  function getInitials(name?: string | null): string {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* ──────── a) User Profile Card ──────── */}
      <motion.div custom={0} variants={cardVariant} initial="hidden" animate="visible">
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary/30 shadow-md overflow-hidden">
                  {user?.image ? (
                    <img src={user.image} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-primary">{getInitials(user?.name)}</span>
                  )}
                </div>
                <div className={cn(
                  'absolute -bottom-0.5 -right-0.5 flex items-center justify-center size-6 rounded-full border-2 border-card text-[10px]',
                  planBadgeClass,
                )}>
                  {planEmoji}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-heading text-lg font-bold truncate">{user?.name || 'Pengguna'}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email || 'Tidak diketahui'}</p>
                <div className="mt-1.5">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border',
                    planBadgeClass,
                  )}>
                    {planEmoji} {planLabel}
                  </span>
                </div>
              </div>

              {/* Edit button */}
              <button
                onClick={() => onOpenSheet('settings')}
                className="flex items-center justify-center size-9 rounded-full bg-muted hover:bg-muted/80 transition"
                aria-label="Edit profil"
              >
                <Settings className="size-4 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ──────── b) Financial Health Score ──────── */}
      <motion.div custom={1} variants={cardVariant} initial="hidden" animate="visible">
        <button
          onClick={() => onOpenSheet('smart-budget')}
          className="w-full text-left"
        >
          <Card className="border-border/50 bg-gradient-to-br from-card to-surface-2 hover:border-primary/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Heart className="size-4 text-red-500" />
                  <h3 className="font-heading text-sm font-semibold">Skor Kesehatan Keuangan</h3>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-5">
                <HealthGauge score={healthData.score} />
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                      <TrendingUp className="size-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Saving Rate</p>
                      <p className="text-sm font-bold tabular-nums">{healthData.savingsRate}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <BarChart3 className="size-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Hari Terlacak</p>
                      <p className="text-sm font-bold tabular-nums">{healthData.daysTracked} hari</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Shield className="size-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Kepatuhan Budget</p>
                      <p className="text-sm font-bold tabular-nums">{healthData.budgetPct}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>
      </motion.div>

      {/* ──────── c) Quick Actions Grid ──────── */}
      <motion.div custom={2} variants={cardVariant} initial="hidden" animate="visible">
        <Card className="border-border/50 bg-gradient-to-br from-card to-surface-2">
          <CardContent className="p-4">
            <h3 className="font-heading text-sm font-semibold mb-3">Aksi Cepat</h3>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.sheet}
                  onClick={() => onOpenSheet(action.sheet)}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2.5 hover:bg-muted/60 active:scale-95 transition-all"
                >
                  <span className="text-xl">{action.emoji}</span>
                  <span className="text-[10px] font-medium text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ──────── d) Pengaturan (Settings) Section ──────── */}
      <motion.div custom={3} variants={cardVariant} initial="hidden" animate="visible">
        <Card className="border-border/50 bg-gradient-to-br from-card to-surface-2">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
              <Settings className="size-4 text-muted-foreground" />
              Pengaturan
            </h3>

            {/* Theme toggle */}
            <ToggleSwitch
              label="Mode Gelap"
              description={theme === 'dark' ? 'Tema gelap aktif' : 'Tema terang aktif'}
              checked={theme === 'dark'}
              onChange={() => toggleTheme()}
            />

            <div className="h-px bg-border/50" />

            {/* Font size */}
            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-sm font-medium">Ukuran Font</p>
                <p className="text-[11px] text-muted-foreground">Sesuaikan keterbacaan</p>
              </div>
              <div className="flex gap-1">
                {(['sm', 'base', 'lg'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                      fontSize === size
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {size === 'sm' ? 'A' : size === 'base' ? 'A' : 'A'}
                    <span className="sr-only">{size === 'sm' ? 'Kecil' : size === 'base' ? 'Normal' : 'Besar'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border/50" />

            {/* Compact mode */}
            <ToggleSwitch
              label="Mode Kompak"
              description="Tampilan lebih rapat"
              checked={compactMode}
              onChange={() => toggleCompactMode()}
            />

            <div className="h-px bg-border/50" />

            {/* PIN Lock */}
            <button
              onClick={() => onOpenSheet('pin')}
              className="flex items-center justify-between w-full py-1.5"
            >
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Kunci PIN</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {pin ? 'Aktif' : 'Nonaktif'}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </button>

            <div className="h-px bg-border/50" />

            {/* Full settings link */}
            <button
              onClick={() => onOpenSheet('settings')}
              className="flex items-center justify-between w-full py-1.5"
            >
              <span className="text-sm font-medium text-primary">Semua Pengaturan</span>
              <ChevronRight className="size-4 text-primary" />
            </button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ──────── e) Subscription Card ──────── */}
      <motion.div custom={4} variants={cardVariant} initial="hidden" animate="visible">
        <Card className={cn(
          'border-border/50 overflow-hidden',
          plan === 'premium'
            ? 'bg-gradient-to-br from-card to-amber-500/5 border-amber-200/30 dark:border-amber-800/30'
            : plan === 'pro'
              ? 'bg-gradient-to-br from-card to-blue-500/5 border-blue-200/30 dark:border-blue-800/30'
              : 'bg-gradient-to-br from-card to-surface-2',
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
                <Crown className="size-4 text-amber-500" />
                Langganan
              </h3>
              <span className={cn('text-[10px] font-bold rounded-full px-2 py-0.5 border', planBadgeClass)}>
                {planEmoji} {planLabel}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paket aktif</span>
                <span className="text-sm font-semibold">{planLabel}</span>
              </div>

              {plan !== 'basic' && daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Berakhir dalam</span>
                  <span className={cn(
                    'text-sm font-semibold',
                    daysUntilExpiry <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
                  )}>
                    {daysUntilExpiry} hari lagi
                  </span>
                </div>
              )}

              {plan === 'basic' && (
                <p className="text-xs text-muted-foreground">
                  Upgrade ke Pro atau Premium untuk fitur lengkap
                </p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onOpenSheet('voucher')}
              >
                <Ticket className="size-3.5 mr-1.5" />
                {plan === 'basic' ? 'Upgrade' : 'Perpanjang'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenSheet('voucher')}
              >
                Redeem Voucher
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ──────── f) Household / Family Card ──────── */}
      <motion.div custom={5} variants={cardVariant} initial="hidden" animate="visible">
        <Card className="border-border/50 bg-gradient-to-br from-card to-surface-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Rumah Tangga
              </h3>
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition"
              >
                {showAddMember ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                {showAddMember ? 'Batal' : 'Tambah'}
              </button>
            </div>

            {/* Add member form */}
            <AnimatePresence>
              {showAddMember && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2.5 pb-4 mb-3 border-b border-border/50">
                    <Input
                      placeholder="Nama anggota"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-9 text-sm"
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      {(['suami', 'istri', 'anak', 'lainnya'] as const).map((role) => (
                        <button
                          key={role}
                          onClick={() => setNewRole(role)}
                          className={cn(
                            'flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition',
                            newRole === role
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {ROLE_CONFIG[role].label}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddMember}
                      disabled={!newName.trim()}
                      className="w-full"
                    >
                      <Plus className="size-3.5 mr-1" />
                      Tambah Anggota
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Member list */}
            {householdMembers.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-center">
                <Users className="size-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Belum ada anggota rumah tangga</p>
                <p className="text-[10px] text-muted-foreground/70">Tambahkan untuk tag transaksi per anggota</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {householdMembers.map((member) => {
                  const roleCfg = ROLE_CONFIG[member.role]
                  return (
                    <motion.div
                      key={member.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5"
                    >
                      {/* Avatar circle */}
                      <div
                        className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white shrink-0"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.name[0].toUpperCase()}
                      </div>
                      {/* Name & role */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <span className={cn('inline-block text-[10px] font-semibold rounded-full px-1.5 py-0.5', roleCfg.bg, roleCfg.color)}>
                          {roleCfg.label}
                        </span>
                      </div>
                      {/* Remove button */}
                      <button
                        onClick={() => removeHouseholdMember(member.id)}
                        className="flex items-center justify-center size-7 rounded-full hover:bg-destructive/10 transition"
                        aria-label={`Hapus ${member.name}`}
                      >
                        <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ──────── g) About / Footer ──────── */}
      <motion.div custom={6} variants={cardVariant} initial="hidden" animate="visible">
        <Card className="border-border/50 bg-gradient-to-br from-card to-surface-2">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-heading text-sm font-semibold flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              Tentang
            </h3>

            {/* Version */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Versi</span>
              <span className="text-sm font-semibold">FinWise v2.0</span>
            </div>

            {/* Cloud sync status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cloud Sync</span>
              <span className={cn(
                'flex items-center gap-1.5 text-xs font-semibold',
                session?.user ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
              )}>
                {session?.user ? (
                  <>
                    <Cloud className="size-3.5" />
                    Tersinkron
                  </>
                ) : (
                  <>
                    <Cloud className="size-3.5" />
                    Offline
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-1">
              Built with ❤️ for Indonesian families
            </p>

            <div className="h-px bg-border/50" />

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => syncNow('manual')}
              >
                <Cloud className="size-3.5 mr-1.5" />
                Sinkron Sekarang
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive"
                onClick={handleClearData}
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Hapus Semua Data
              </Button>
              {session?.user && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  <LogOut className="size-3.5 mr-1.5" />
                  Keluar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

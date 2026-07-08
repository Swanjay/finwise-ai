'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  BarChart3, Camera, Home, ListChecks, Plus, Sparkles, Wallet,
  Settings, ChevronLeft, ChevronRight, Target, Repeat, Download,
  FileText, Lock, Lightbulb, X,
  Upload,
  ArrowLeftRight,
  Users, CreditCard, Mic, Heart, User, Ticket,
  Eye, EyeOff, LogOut,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { FinwiseProvider, useFinwise } from '@/components/finwise-store'
import { DashboardView } from '@/components/finwise/dashboard-view'
import { TransactionsView } from '@/components/finwise/transactions-view'
import { TrendsView } from '@/components/finwise/trends-view'
import { SplashScreen } from '@/components/splash-screen'
import { LoadingScreen } from '@/components/finwise/mascot'
import { SmartNotifications } from '@/components/finwise/smart-notifications'
import { useGamification, BadgeUnlockToast } from '@/components/finwise/gamification'
import { PricingTableFooter } from '@/components/finwise/pricing-table-footer'
import { haptic } from '@/lib/haptics'
import FinWiseLogo from '@/components/finwise-logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { BudgetProgress } from '@/components/finwise/budget-progress'
import {
  formatIDR,
  filterByMonth, getMonthKey, getMonthLabel,
  EXPENSE_CATEGORIES,
  generateId,
  formatIDRInput, parseIDRInput,
  type Transaction,
  type Wallet as WalletType,
} from '@/lib/finwise'
import { cn } from '@/lib/utils'
import { FEATURE_NAMES } from '@/hooks/use-feature-access'
import { loadPlan, canAccess, getPlanInfo } from '@/lib/plans'

// Sheet components
import { AddSheet } from '@/components/sheets/add-sheet'
import { ScanSheet } from '@/components/sheets/scan-sheet'
import { SettingsSheet } from '@/components/sheets/settings-sheet'
import { GoalsSheet } from '@/components/sheets/goals-sheet'
import { WalletsSheet } from '@/components/sheets/wallets-sheet'
import { TransferSheet } from '@/components/sheets/transfer-sheet'
import { RecurringSheet } from '@/components/sheets/recurring-sheet'
import { ExportSheet } from '@/components/sheets/export-sheet'
import { CategoriesSheet } from '@/components/sheets/categories-sheet'
import { PinSheet } from '@/components/sheets/pin-sheet'
import { BenchmarkSheet } from '@/components/sheets/benchmark-sheet'
import { AdvisorSheet } from '@/components/sheets/advisor-sheet'
import { SmartBudgetSheetWrapper } from '@/components/sheets/smart-budget-sheet'
import { SplitBillSheetWrapper } from '@/components/sheets/split-bill-sheet'
import { NotificationsSheet } from '@/components/sheets/notifications-sheet'
import { VoiceSheet } from '@/components/sheets/voice-sheet'
import { VoucherSheetWrapper } from '@/components/sheets/voucher-sheet'

type Tab = 'home' | 'transactions' | 'trends' | 'budget'
type Sheet = 'add' | 'scan' | 'advisor' | 'settings' | 'goals' | 'wallets' | 'transfer' | 'recurring' | 'export' | 'categories' | 'pin' | 'benchmark' | 'smart-budget' | 'split-bill' | 'notifications' | 'voice' | 'voucher' | null

// ─── PIN Lock Screen ───
function PinLock() {
  const { pin, unlock, setPin, resetAll } = useFinwise()
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [showForgotPin, setShowForgotPin] = useState(false)

  if (!pin) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input))
    const hashed = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
    if (hashed === pin) { 
      unlock()
      setFailedAttempts(0)
    } else { 
      setError(true)
      setFailedAttempts(prev => prev + 1)
      setTimeout(() => setError(false), 1000) 
    }
  }

  function handleForgotPin() {
    setShowForgotPin(true)
  }

  function handleResetData() {
    if (confirm('⚠️ PERINGATAN!\n\nIni akan menghapus:\n• SEMUA transaksi\n• SEMUA wallet & saldo\n• PIN\n• Semua data lainnya\n\nAksi ini TIDAK bisa dibatalkan.\n\nLanjutkan?')) {
      resetAll()
      // Unlock will happen automatically since pin is cleared
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6">
      <Lock className="size-12 text-primary mb-4" />
      <h1 className="font-heading text-xl font-bold mb-6">Masukkan PIN</h1>
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <div className="relative">
          <Input type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} placeholder="PIN" value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))} className={cn('h-12 text-center text-2xl tracking-[0.5em] tabular-nums', error && 'border-destructive animate-shake')} autoFocus />
          <button type="button" onClick={() => setShowPin(!showPin)} aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
        </div>
        {error && <p className="text-xs text-destructive text-center">PIN salah ({failedAttempts}/5)</p>}
        <Button type="submit" disabled={input.length < 4}>Buka</Button>
        
        {failedAttempts >= 3 && (
          <button
            type="button"
            onClick={handleForgotPin}
            className="text-sm text-muted-foreground hover:text-primary transition mt-2"
          >
            Lupa PIN?
          </button>
        )}
      </form>

      {/* Forgot PIN Modal */}
      {showForgotPin && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-center">Lupa PIN?</h2>
            <p className="text-sm text-muted-foreground text-center">
              Pilih opsi recovery:
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  alert('📧 Link reset akan dikirim ke email kamu.\n\nCek inbox dan klik link untuk membuat PIN baru.\n\n(Coming soon: integrasi dengan email service)')
                  setShowForgotPin(false)
                }}
                variant="outline"
                className="w-full"
              >
                📧 Kirim Link Reset via Email
              </Button>

              <Button
                onClick={() => {
                  handleResetData()
                  setShowForgotPin(false)
                }}
                variant="destructive"
                className="w-full"
              >
                🗑️ Reset Semua Data
              </Button>

              <Button
                onClick={() => setShowForgotPin(false)}
                variant="ghost"
                className="w-full"
              >
                Batal
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              ⚠️ Reset data akan menghapus semua transaksi & PIN
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Month Navigator ───
function MonthNavigator({ monthKey, onChange }: { monthKey: string; onChange: (k: string) => void }) {
  function shift(delta: number) {
    const [y, m] = monthKey.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    onChange(getMonthKey(d))
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => shift(-1)} aria-label="Bulan sebelumnya" className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /></button>
      <span className="min-w-[5rem] text-center text-sm font-medium">{getMonthLabel(monthKey)}</span>
      <button onClick={() => shift(1)} aria-label="Bulan berikutnya" className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"><ChevronRight className="size-4" /></button>
    </div>
  )
}

import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/error-boundary'
const OnboardingWizard = dynamic(() => import('@/components/finwise/onboarding-wizard').then(m => m.OnboardingWizard), { ssr: false, loading: () => <div className="min-h-screen bg-background" /> })
// ─── Budget Tab ───
function BudgetTab({ transactions }: { transactions: Transaction[] }) {
  const { monthlyIncome, budgets, setBudget } = useFinwise()
  const [editing, setEditing] = useState(false)
  const spentMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-primary/30 bg-gradient-to-br from-card to-surface-2">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">Pemasukan bulanan</p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{formatIDR(monthlyIncome)}</p>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold">Limit per Kategori</h2>
        <Button size="sm" variant={editing ? 'default' : 'outline'} onClick={() => setEditing(!editing)}>{editing ? 'Selesai' : 'Edit'}</Button>
      </div>
      {editing ? (
        <Card><CardContent className="p-4 flex flex-col gap-3">
          {EXPENSE_CATEGORIES.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.id} className="flex items-center gap-3">
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm">{c.label}</span>
                <Input inputMode="numeric" placeholder="0" defaultValue={formatIDRInput(String(budgets[c.id] || ''))} onBlur={(e) => setBudget(c.id, parseIDRInput(e.target.value))} className="w-28 h-8 text-xs tabular-nums text-right" />
              </div>
            )
          })}
        </CardContent></Card>
      ) : (
        <Card><CardContent><BudgetProgress spentByCat={spentMap} /></CardContent></Card>
      )}
    </div>
  )
}

// ─── Onboarding Tips ───
function OnboardingTips({ onDismiss }: { onDismiss: () => void }) {
  const tips = [
    { emoji: '💰', title: '50-30-20 Rule', desc: 'Alokasikan 50% kebutuhan, 30% keinginan, 20% tabungan.' },
    { emoji: '📊', title: 'Pantau Rutin', desc: 'Catat transaksi setiap hari agar tidak terlewat.' },
    { emoji: '🎯', title: 'Buat Target', desc: 'Tentukan target tabungan untuk motivasi menabung.' },
  ]
  return (
    <Card className="border-accent/30 bg-gradient-to-br from-card to-accent/5">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="size-4 text-accent" /> Tips Keuangan</span>
          <button onClick={onDismiss} aria-label="Tutup tips" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
        </div>
        {tips.map((t) => (
          <div key={t.title} className="flex gap-3 items-start">
            <span className="text-lg">{t.emoji}</span>
            <div><p className="text-sm font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{t.desc}</p></div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── User Avatar ───
function UserAvatar({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { data: session } = useSession()
  const [showMenu, setShowMenu] = useState(false)
  const user = session?.user
  if (!user) return null

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)} aria-label="Menu profil" className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary/20 ring-2 ring-primary/30 shadow-md hover:ring-primary/50 transition" style={{ boxShadow: '0 4px 12px var(--theme-shadow, rgba(46,173,75,0.15))' }}>
        {user.image ? (
          <img src={user.image} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-primary">{(user.name || 'U')[0].toUpperCase()}</span>
        )}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            {/* Profile header */}
            <div className="flex items-center gap-2.5 p-3 bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border">
              <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-primary/20">
                {user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : <span className="text-sm font-bold text-primary">{(user.name || 'U')[0].toUpperCase()}</span>}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email || 'Telegram'}</p>
              </div>
            </div>
            {/* Features */}
            <div className="p-2">
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fitur</p>
              <Link href="/households" onClick={() => setShowMenu(false)} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted transition">
                <Users className="size-4 text-primary" /> Household
              </Link>
              <Link href="/subscriptions" onClick={() => setShowMenu(false)} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted transition">
                <CreditCard className="size-4 text-primary" /> Subscription
              </Link>
              <Link href="/voice" onClick={() => setShowMenu(false)} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted transition">
                <Mic className="size-4 text-orange-400" /> Voice Input
              </Link>
              <Link href="/score" onClick={() => setShowMenu(false)} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted transition">
                <Heart className="size-4 text-red-400" /> Health Score
              </Link>
            </div>
            {/* Settings & Logout */}
            <div className="p-2 border-t border-border">
              <Link href="/profile" onClick={() => setShowMenu(false)} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted transition">
                <User className="size-4 text-blue-400" /> Edit Profil
              </Link>
              <button onClick={() => { setShowMenu(false); onOpenSettings?.() }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted transition">
                <Settings className="size-4 text-muted-foreground" /> Pengaturan
              </button>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-destructive transition hover:bg-destructive/10">
                <LogOut className="size-4" /> Keluar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main App Shell ───
function AppShell() {
  const { transactions, isLocked, pin, tipsDismissed, dismissTips, allCategories, addTransaction, wallets, theme, toggleTheme, plan } = useFinwise()
  const { stats, newBadge, clearNewBadge } = useGamification()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('home')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [monthKey, setMonthKey] = useState(getMonthKey(new Date()))
  const [isLoading, setIsLoading] = useState(true)
  const [fabOpen, setFabOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState<string | null>(null)

  // Simulate loading on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  // Listen for open-sheet events (used by WalletsSheet to open TransferSheet)
  useEffect(() => {
    const handler = (e: Event) => {
      const sheetName = (e as CustomEvent).detail as Sheet
      if (sheetName) setSheet(sheetName)
    }
    window.addEventListener('open-sheet', handler)
    return () => window.removeEventListener('open-sheet', handler)
  }, [])

  const monthTx = useMemo(() => filterByMonth(transactions, monthKey), [transactions, monthKey])

  if (isLocked && pin) return <PinLock />
  if (isLoading) return <LoadingScreen message="Menyiapkan dashboard..." />

  const navItems: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'transactions', label: 'Transaksi', icon: ListChecks },
    { id: 'trends', label: 'Rencana', icon: BarChart3 },
    { id: 'budget', label: 'Kesehatan', icon: Wallet },
  ]

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      {/* Header — Clay Style */}
      <header className="flex items-center justify-between px-5 pb-3 pt-6">
        <div className="flex items-center gap-2.5">
          <FinWiseLogo size={36} showText={false} />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Selamat datang 👋</p>
            <h2 className="font-heading text-base font-bold text-foreground leading-tight">
              {tab === 'home' && 'Home'}
              {tab === 'transactions' && 'Transaksi'}
              {tab === 'trends' && 'Rencana'}
              {tab === 'budget' && 'Kesehatan'}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Plan Badge */}
          <button onClick={() => setSheet('voucher')} className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all hover:scale-105',
            plan === 'basic' ? 'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' :
            plan === 'pro' ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
            'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
          )}>
            <span>{plan === 'basic' ? '🆓' : plan === 'pro' ? '💎' : '👑'}</span>
            <span>{plan === 'basic' ? 'Basic' : plan === 'pro' ? 'Pro' : 'Premium'}</span>
          </button>
          <MonthNavigator monthKey={monthKey} onChange={setMonthKey} />
          <UserAvatar onOpenSettings={() => setSheet('settings')} />
        </div>
      </header>

      {/* Plan Expiry Notice */}
      {plan !== 'basic' && (() => {
        const planInfo = getPlanInfo()
        if (!planInfo.expiresAt) return null
        const expiry = new Date(planInfo.expiresAt)
        const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        const isExpiringSoon = daysLeft <= 7 && daysLeft > 0
        const isExpired = daysLeft <= 0
        if (isExpired) return null // Plan already downgraded by loadPlan()
        return (
          <div className={cn(
            'mx-5 mb-2 rounded-lg px-3 py-1.5 text-[10px] font-medium flex items-center justify-between',
            isExpiringSoon
              ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
              : 'bg-primary/5 text-primary border border-primary/20',
          )}>
            <span>
              {isExpiringSoon ? '⚠️ ' : '✅ '}Aktif sampai {expiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ({daysLeft} hari lagi)
            </span>
            {isExpiringSoon && (
              <button onClick={() => setSheet('voucher')} className="text-[10px] font-bold underline">Perpanjang</button>
            )}
          </div>
        )
      })()}

      {/* Quick Actions Bar */}
      <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { icon: Sparkles, label: 'AI Advisor', sheet: 'advisor' as Sheet, feature: 'ai_advisor' },
          { icon: Camera, label: 'Scan', sheet: 'scan' as Sheet, feature: 'ai_scan' },
          { icon: Target, label: 'Target', sheet: 'goals' as Sheet, feature: 'goals' },
          { icon: Wallet, label: 'Dompet', sheet: 'wallets' as Sheet, feature: 'wallets' },
          { icon: ArrowLeftRight, label: 'Transfer', sheet: 'transfer' as Sheet, feature: null },
          { icon: Repeat, label: 'Berulang', sheet: 'recurring' as Sheet, feature: 'recurring' },
          { icon: Download, label: 'Export', sheet: 'export' as Sheet, feature: 'export_csv' },
          { icon: Upload, label: 'Backup', sheet: 'export' as Sheet, feature: 'export_csv' },
          { icon: BarChart3, label: 'Benchmark', sheet: 'benchmark' as Sheet, feature: 'reports_charts' },
          { icon: FileText, label: 'Kategori', sheet: 'categories' as Sheet, feature: 'custom_categories' },
          { icon: Lock, label: 'PIN', sheet: 'pin' as Sheet, feature: null },
          { icon: Ticket, label: 'Voucher', sheet: 'voucher' as Sheet, feature: null },
        ].map((a) => {
          const Icon = a.icon
          const isLocked = a.feature && !canAccess(plan, a.feature)
          return (
            <button
              key={a.label}
              onClick={() => {
                if (a.feature && !canAccess(plan, a.feature)) {
                  setShowUpgradeModal(a.feature)
                  return
                }
                setSheet(a.sheet)
              }}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition',
                isLocked
                  ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                  : 'bg-card text-primary hover:bg-muted',
              )}
              style={!isLocked ? { boxShadow: '0 3px 10px var(--theme-shadow, rgba(46,173,75,0.15))' } : undefined}
            >
              {isLocked ? <Lock className="size-3" /> : <Icon className="size-3.5" />}
              {a.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-32">
        {!tipsDismissed && tab === 'home' && <OnboardingTips onDismiss={dismissTips} />}
        {tab === 'home' && <DashboardView transactions={monthTx} month={getMonthLabel(monthKey)} onOpenGoals={() => setSheet('goals')} onOpenWallets={() => setSheet('wallets')} onOpenAdd={() => setSheet('add')} onOpenReports={() => router.push('/reports')} />}
        {tab === 'transactions' && <TransactionsView />}
        {tab === 'trends' && <TrendsView />}
        {tab === 'budget' && <BudgetTab transactions={monthTx} />}

        {/* Pricing Table Footer */}
        {tab === 'home' && <PricingTableFooter currentPlan={plan} onUpgrade={() => setSheet('voucher')} />}
      </main>

      {/* Bottom nav — Clay Style */}
      <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto max-w-[360px] px-4">
        <div className="clay-bottom-nav grid grid-cols-5 items-center px-3 py-2">
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.id}
              onClick={() => { haptic.light(); setTab(item.id) }}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-2xl py-1.5 px-2 text-[10px] font-semibold transition',
                tab === item.id
                  ? 'bg-[var(--color-clay-green,#9fe870)] text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="size-5" />{item.label}
            </button>
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => {
                haptic.medium()
                if (!canAccess(plan, 'ai_scan')) { setShowUpgradeModal('ai_scan'); return }
                setSheet('scan')
              }}
              aria-label="Scan struk"
              className="clay-btn -mt-5 flex size-14 items-center justify-center"
            >
              <Camera className="size-6" />
            </button>
          </div>
          {navItems.slice(2).map((item) => (
            <button
              key={item.id}
              onClick={() => { haptic.light(); setTab(item.id) }}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-2xl py-1.5 px-2 text-[10px] font-semibold transition',
                tab === item.id
                  ? 'bg-[var(--color-clay-green,#9fe870)] text-primary'
                  : 'text-muted-foreground hover:text-primary'
              )}
            >
              <item.icon className="size-5" />{item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* FAB — Expandable */}
      <div className="fixed bottom-20 right-5 z-30 flex flex-col-reverse items-center gap-3 sm:hidden">
        {/* Main FAB button — toggles menu */}
        <button
          onClick={() => { haptic.medium(); setFabOpen(!fabOpen) }}
          aria-label={fabOpen ? 'Tutup menu' : 'Buka menu aksi'}
          className={`clay-btn flex size-14 items-center justify-center shadow-lg transition-transform duration-300 ${fabOpen ? 'rotate-45' : ''}`}
        >
          <Plus className="size-6" />
        </button>
        {/* Sub buttons — only visible when fabOpen */}
        {fabOpen && (
          <>
            <button
              onClick={() => {
                haptic.light()
                setFabOpen(false)
                if (!canAccess(plan, 'ai_scan')) { setShowUpgradeModal('ai_scan'); return }
                setSheet('scan')
              }}
              aria-label="Scan struk"
              className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-primary text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <Camera className="size-5" />
            </button>
            <button
              onClick={() => {
                haptic.light()
                setFabOpen(false)
                if (!canAccess(plan, 'voice_input')) { setShowUpgradeModal('voice_input'); return }
                setSheet('voice')
              }}
              aria-label="Voice input"
              className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-green-700 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 delay-75"
            >
              <Mic className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Sheets */}
      <AddSheet open={sheet === 'add'} onClose={() => setSheet(null)} />
      <ScanSheet open={sheet === 'scan'} onClose={() => setSheet(null)} />
      <SettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} onOpenSheet={(s) => setSheet(s as Sheet)} />
      <GoalsSheet open={sheet === 'goals'} onClose={() => setSheet(null)} />
      <WalletsSheet open={sheet === 'wallets'} onClose={() => setSheet(null)} />
      <TransferSheet open={sheet === 'transfer'} onClose={() => setSheet(null)} />
      <RecurringSheet open={sheet === 'recurring'} onClose={() => setSheet(null)} />
      <ExportSheet open={sheet === 'export'} onClose={() => setSheet(null)} />
      <CategoriesSheet open={sheet === 'categories'} onClose={() => setSheet(null)} />
      <PinSheet open={sheet === 'pin'} onClose={() => setSheet(null)} />
      <BenchmarkSheet open={sheet === 'benchmark'} onClose={() => setSheet(null)} />
      <AdvisorSheet open={sheet === 'advisor'} onClose={() => setSheet(null)} />
      <SmartBudgetSheetWrapper open={sheet === 'smart-budget'} onClose={() => setSheet(null)} />
      <SplitBillSheetWrapper open={sheet === 'split-bill'} onClose={() => setSheet(null)} />
      <NotificationsSheet open={sheet === 'notifications'} onClose={() => setSheet(null)} />
      <VoiceSheet open={sheet === 'voice'} onClose={() => setSheet(null)} />
      <VoucherSheetWrapper open={sheet === 'voucher'} onClose={() => setSheet(null)} />

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <div className="text-3xl">🔒</div>
            <h2 className="font-heading text-lg font-bold">Fitur Premium</h2>
            <p className="text-sm text-muted-foreground">
              {FEATURE_NAMES[showUpgradeModal] || showUpgradeModal} hanya tersedia untuk paket <strong>Pro</strong> atau <strong>Premium</strong>.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/pricing">
                <Button className="w-full gap-2">
                  <Sparkles className="size-4" /> Lihat Paket Harga
                </Button>
              </Link>
              <Button variant="ghost" onClick={() => setShowUpgradeModal(null)}>Nanti Saja</Button>
            </div>
          </div>
        </div>
      )}

      {/* Badge unlock toast */}
      {newBadge && <BadgeUnlockToast badge={newBadge} onClose={clearNewBadge} />}
    </div>
  )
}

function OnboardingGate() {
  const { setupDone, setSetupDone, wallets, addWallet, updateWallet, updateMonthlyIncome, loaded } = useFinwise()
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    if (loaded && !setupDone) {
      setShowWizard(true)
    }
    // Auto-close wizard if cloud says setupDone=true
    if (setupDone && showWizard) {
      setShowWizard(false)
    }
  }, [loaded, setupDone, showWizard])

  const handleComplete = useCallback((data: {
    selectedCategories: string[]
    wallets: Array<{ id: string; name: string; icon: string; balance: string; color: string; type: 'bank' | 'ewallet' | 'cash' | 'credit'; logo?: string }>
    salaryAmount: number
    salaryDay: number
  }) => {
    // Persist setupDone FIRST so it survives even if wallet creation fails
    try {
      localStorage.setItem('fw.setupDone.v1', 'true')
    } catch {}
    setSetupDone(true)
    setShowWizard(false)

    // Set up all wallets (wrapped in try-catch for safety)
    try {
      for (const w of data.wallets) {
        const balance = Number(String(w.balance || '').replace(/\D/g, '')) || 0
        const existing = wallets.find(e => e.name.toLowerCase() === w.name.toLowerCase())
        if (existing) {
          updateWallet(existing.id, { balance, logo: w.logo })
        } else {
          addWallet({ id: generateId(), name: w.name, icon: w.icon, balance, color: w.color, type: w.type, logo: w.logo })
        }
      }

      // Set salary config
      if (data.salaryAmount > 0) {
        updateMonthlyIncome(data.salaryAmount)
        try {
          localStorage.setItem('fw.salary', JSON.stringify({ amount: data.salaryAmount, day: data.salaryDay }))
        } catch {}
      }
    } catch (err) {
      console.error('[Onboarding] Error saving data:', err)
    }
  }, [wallets, addWallet, updateWallet, updateMonthlyIncome, setSetupDone])

  if (showWizard) {
    return <OnboardingWizard onComplete={handleComplete} />
  }

  return <AppShell />
}

export default function Page() {
  const { status } = useSession()

  if (status === 'unauthenticated') {
    const LandingPage = require('@/components/landing-page').default
    return <LandingPage />
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Image src="/mascot-128.png?v=4" alt="FinWise" width={64} height={64} className="animate-pulse drop-shadow-lg" />
          <div className="h-1.5 w-24 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <FinwiseProvider>
      <SplashScreen />
      <SmartNotifications />
      <ErrorBoundary>
        <OnboardingGate />
      </ErrorBoundary>
    </FinwiseProvider>
  )
}

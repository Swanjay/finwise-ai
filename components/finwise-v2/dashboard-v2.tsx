'use client'

import { useState, useMemo } from 'react'
import { useFinwise } from '@/components/finwise-store'
import { formatIDRShort, summarize, filterByMonth, getMonthKey } from '@/lib/finwise'
import { cn } from '@/lib/utils'
import {
  Home, Wallet, CreditCard, ArrowDownUp, BarChart3, Target, ReceiptText,
  TrendingUp, Lightbulb, Settings, User, Bell, Eye, EyeOff,
  ChevronLeft, ChevronRight, ArrowUpRight,
} from 'lucide-react'

type Sheet = string

// ─── Stat Card ───
function StatCard({ label, value, change, changeType = 'neutral' }: {
  label: string; value: string; change?: string; changeType?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="rounded-2xl p-4 bg-card border border-border shadow-sm">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-extrabold text-foreground tracking-tight tabular-nums">{value}</p>
      {change && (
        <p className={cn(
          'text-[10px] font-semibold mt-1',
          changeType === 'up' && 'text-green-600',
          changeType === 'down' && 'text-red-500',
          changeType === 'neutral' && 'text-muted-foreground'
        )}>{change}</p>
      )}
    </div>
  )
}

// ─── Cashflow Chart ───
function CashflowChart({ transactions }: { transactions: { type: string; amount: number; date: string }[] }) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const data = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    startOfWeek.setHours(0, 0, 0, 0)
    const inc = Array(7).fill(0)
    const exp = Array(7).fill(0)
    for (const t of transactions) {
      const d = new Date(t.date)
      const diff = Math.floor((d.getTime() - startOfWeek.getTime()) / 86400000)
      if (diff >= 0 && diff < 7) {
        if (t.type === 'income') inc[diff] += t.amount
        else exp[diff] += t.amount
      }
    }
    const max = Math.max(...inc, ...exp, 1)
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
      day, incomeH: (inc[i] / max) * 100, expenseH: (exp[i] / max) * 100,
    }))
  }, [transactions])

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Spending</h3>
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as const).map((t) => (
            <button key={t} onClick={() => setPeriod(t)}
              className={cn('h-6 px-2.5 rounded-md text-[10px] font-semibold transition',
                period === t ? 'bg-foreground text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-[100px] pb-2 border-b border-border">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '80px' }}>
              <div className="w-full rounded-t-md rounded-b-sm min-h-[4px]"
                style={{ height: `${d.incomeH}%`, background: 'var(--success)' }} />
              <div className="w-full rounded-t-md rounded-b-sm min-h-[4px]"
                style={{ height: `${d.expenseH}%`, background: 'var(--destructive)' }} />
            </div>
            <span className="text-[9px] font-semibold text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Transaction List ───
function TransactionList({ transactions, onViewAll }: {
  transactions: { id: string; type: 'income' | 'expense'; category: string; amount: number; description: string; date: string; wallet?: string }[];
  onViewAll?: () => void
}) {
  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = {
      food: '🍜', transport: '🚗', shopping: '🛍️', entertainment: '🎬',
      health: '💊', education: '📚', bills: '🧾', salary: '💼',
      freelance: '💻', investment: '📈', gifts: '🎁', other: '📌',
    }
    return icons[cat] || '📌'
  }
  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      food: 'var(--red-bg)', transport: 'var(--blue-bg)', shopping: 'var(--purple-bg)',
      entertainment: 'var(--amber-bg)', health: 'var(--green-bg)', bills: 'var(--amber-bg)',
      salary: 'var(--green-bg)', freelance: 'var(--blue-bg)', investment: 'var(--purple-bg)',
    }
    return colors[cat] || 'var(--muted)'
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
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Recent Transactions</h3>
        {onViewAll && <button onClick={onViewAll} className="text-xs font-semibold text-primary hover:underline">View All</button>}
      </div>
      <div className="space-y-1">
        {transactions.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">Belum ada transaksi</p>
        )}
        {transactions.slice(0, 5).map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shadow-sm"
              style={{ background: getCategoryColor(tx.category) }}>{getCategoryIcon(tx.category)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{tx.description}</p>
              <p className="text-[10px] text-muted-foreground">{timeAgo(tx.date)}{tx.wallet ? ` · ${tx.wallet}` : ''}</p>
            </div>
            <span className={cn('text-sm font-extrabold tabular-nums', tx.type === 'income' ? 'text-green-600' : 'text-red-500')}>
              {tx.type === 'income' ? '+' : '-'}{formatIDRShort(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Props ───
interface DashboardV2Props {
  onOpenSheet?: (sheet: Sheet) => void
  onNavigate?: (tab: string) => void
}

// ─── Main Dashboard ───
export function DashboardV2({ onOpenSheet, onNavigate }: DashboardV2Props) {
  const {
    transactions, wallets, goals, budgets,
    getTotalBalance, getWalletBalance, allCategories,
    hideBalance, toggleHideBalance, plan,
  } = useFinwise()

  const [currentScreen, setCurrentScreen] = useState<'home' | 'accounts' | 'settings'>('home')

  const monthKey = getMonthKey(new Date())
  const monthTransactions = useMemo(() => filterByMonth(transactions, monthKey), [transactions, monthKey])
  const { income, expense, surplus } = summarize(monthTransactions)
  const totalBalance = getTotalBalance()
  const savingRate = income > 0 ? Math.round((surplus / income) * 100) : 0
  const budgetPct = useMemo(() => {
    const totalBudgetLimit = Object.values(budgets).reduce<number>((sum, v) => sum + (v ?? 0), 0)
    return totalBudgetLimit > 0 ? Math.min(Math.round((expense / totalBudgetLimit) * 100), 100) : 0
  }, [budgets, expense])

  const walletBalances = useMemo(
    () => wallets.map(w => ({ ...w, balance: getWalletBalance(w.id) })).filter(w => w.balance !== 0),
    [wallets, getWalletBalance]
  )

  const recent = transactions.slice(0, 5).map(t => ({
    id: t.id, type: t.type as 'income' | 'expense', category: t.category, amount: t.amount,
    description: t.description || t.category, date: t.date,
    wallet: wallets.find(w => w.id === t.walletId)?.name,
  }))

  const openSheet = (sheet: string) => {
    if (onOpenSheet) onOpenSheet(sheet)
    else window.dispatchEvent(new CustomEvent('open-sheet', { detail: sheet }))
  }

  const services = [
    { icon: ArrowUpRight, label: 'Transfer', sheet: 'transfer' },
    { icon: ReceiptText, label: 'Bills', sheet: 'scan' },
    { icon: Target, label: 'Goals', sheet: 'goals' },
    { icon: BarChart3, label: 'Budget', sheet: 'smart-budget' },
    { icon: TrendingUp, label: 'Invest', sheet: 'benchmark' },
    { icon: Lightbulb, label: 'AI Insight', sheet: 'advisor' },
    { icon: CreditCard, label: 'Cards', sheet: 'wallets' },
    { icon: Wallet, label: 'Accounts', sheet: 'wallets' },
  ]

  const formatBal = (n: number) => hideBalance ? '••••••' : formatIDRShort(n)

  // ─── Settings Screen ───
  if (currentScreen === 'settings') {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <div className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card">
          <button onClick={() => setCurrentScreen('home')}
            className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <h1 className="text-lg font-extrabold text-foreground">Settings</h1>
        </div>
        <main className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">San</h3>
              <p className="text-xs text-primary font-semibold cursor-pointer">View profile →</p>
            </div>
          </div>
          {[
            { icon: Settings, title: 'General', desc: 'Language, currency', sheet: 'settings' },
            { icon: ReceiptText, title: 'Set up PIN', desc: 'Security & biometric', sheet: 'pin' },
            { icon: BarChart3, title: 'Themes', desc: 'Warm, Stone, Sage, Slate, Rose', sheet: null },
            { icon: Home, title: 'Dashboard', desc: 'Widget layout', sheet: null },
            { icon: Bell, title: 'Notifications', desc: 'Alerts, reminders', sheet: 'notifications' },
          ].map((item) => (
            <div key={item.title}
              onClick={() => item.sheet && openSheet(item.sheet)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <item.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </main>
        <BottomNav activeScreen={currentScreen} onNavigate={(s) => {
          if (s === 'home') setCurrentScreen('home')
          else if (s === 'profile') setCurrentScreen('settings')
          else if (onNavigate) onNavigate(s)
        }} />
      </div>
    )
  }

  // ─── Main Home Screen ───
  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Balance</p>
          <p className="text-xl font-extrabold text-foreground tracking-tight tabular-nums">{formatBal(totalBalance)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleHideBalance}
            className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center">
            {hideBalance ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button onClick={() => openSheet('notifications')}
            className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => openSheet('wallets')}
            className="h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Wallet className="w-5 h-5" />
          </button>
          <button onClick={() => openSheet('wallets')}
            className="h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <CreditCard className="w-5 h-5" />
          </button>
          <button onClick={() => onNavigate ? onNavigate('transactions') : null}
            className="h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </button>
          <button onClick={() => openSheet('add')}
            className="h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>

        {/* Services */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">Services</h3>
            <span className="text-xs font-semibold text-primary cursor-pointer">Edit</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {services.map((svc) => (
              <button key={svc.label} onClick={() => openSheet(svc.sheet)}
                className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                  <svc.icon className="w-5 h-5 text-foreground" />
                </div>
                <span className="text-[10px] font-semibold text-foreground">{svc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Income" value={formatIDRShort(income)} change={`+Rp${formatIDRShort(income * 0.18)}`} changeType="up" />
          <StatCard label="Expense" value={formatIDRShort(expense)} change={`-Rp${formatIDRShort(expense * 0.12)}`} changeType="down" />
          <StatCard label="Saving Rate" value={`${savingRate}%`} change={`${savingRate > 0 ? '+' : ''}${savingRate}%`} changeType={savingRate > 0 ? 'up' : 'neutral'} />
          <StatCard label="Budget Used" value={`${budgetPct}%`} change={budgetPct < 80 ? 'Safe zone' : 'Warning'} changeType={budgetPct < 80 ? 'neutral' : 'down'} />
        </div>

        {/* Current Accounts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">Current Accounts</h3>
            <button onClick={() => setCurrentScreen('accounts')} className="text-xs font-semibold text-primary cursor-pointer">View All</button>
          </div>
          <div className="space-y-2">
            {walletBalances.length === 0 && (
              <button onClick={() => openSheet('wallets')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-foreground">Tambah Dompet</p>
                  <p className="text-[10px] text-muted-foreground">Klik untuk menambah dompet pertama</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            {walletBalances.slice(0, 2).map((w) => (
              <div key={w.id} onClick={() => openSheet('wallets')}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{w.name}</p>
                  <p className="text-[10px] text-muted-foreground">•••• {w.id.slice(-4)}</p>
                </div>
                <span className="text-sm font-extrabold text-foreground">{formatBal(w.balance)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cashflow */}
        <CashflowChart transactions={monthTransactions} />

        {/* Transactions */}
        <TransactionList transactions={recent} onViewAll={() => {
          if (onNavigate) onNavigate('transactions')
        }} />
      </main>

      {/* Bottom Nav */}
      <BottomNav activeScreen={currentScreen} onNavigate={(s) => {
        if (s === 'home') setCurrentScreen('home')
        else if (s === 'profile') setCurrentScreen('settings')
        else if (onNavigate) onNavigate(s)
      }} />
    </div>
  )
}

// ─── Bottom Nav ───
function BottomNav({ activeScreen, onNavigate }: { activeScreen: string; onNavigate: (screen: string) => void }) {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'transactions', icon: CreditCard, label: 'Cards' },
    { id: 'add', icon: ArrowDownUp, label: 'Tx' },
    { id: 'profile', icon: User, label: 'Profile' },
  ]

  return (
    <div className="h-16 flex items-center justify-around border-t border-border bg-card">
      {navItems.map((item) => (
        <button key={item.id} onClick={() => onNavigate(item.id)}
          className="flex flex-col items-center gap-0.5">
          <item.icon className={cn('w-5 h-5',
            (item.id === 'home' && activeScreen === 'home') ||
            (item.id === 'profile' && activeScreen === 'settings')
              ? 'text-primary' : 'text-muted-foreground'
          )} />
          <span className={cn('text-[9px] font-semibold',
            (item.id === 'home' && activeScreen === 'home') ||
            (item.id === 'profile' && activeScreen === 'settings')
              ? 'text-primary' : 'text-muted-foreground'
          )}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

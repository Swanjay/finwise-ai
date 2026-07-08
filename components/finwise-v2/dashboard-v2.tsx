'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFinwise } from '@/components/finwise-store'
import { formatIDR, formatIDRShort, summarize, spendingByCategory, filterByMonth, getMonthKey } from '@/lib/finwise'
import { cn } from '@/lib/utils'
import {
  Home, Wallet, CreditCard, ArrowDownUp, BarChart3, Target, ReceiptText,
  TrendingUp, Lightbulb, Settings, User, Search, Bell, Eye, EyeOff,
  ChevronLeft, ChevronRight, Plus, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

// ─── Stat Card ───
function StatCard({ label, value, change, changeType = 'neutral' }: { label: string; value: string; change?: string; changeType?: 'up' | 'down' | 'neutral' }) {
  return (
    <div className="rounded-2xl p-4 bg-card border border-border shadow-sm">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-extrabold text-foreground tracking-tight tabular-nums">{value}</p>
      {change && (
        <p className={cn('text-[10px] font-semibold mt-1', changeType === 'up' && 'text-green-600', changeType === 'down' && 'text-red-500', changeType === 'neutral' && 'text-muted-foreground')}>
          {change}
        </p>
      )}
    </div>
  )
}

// ─── Cashflow Chart ───
function CashflowChart({ transactions }: { transactions: { type: string; amount: number; date: string }[] }) {
  const data = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    startOfWeek.setHours(0, 0, 0, 0)
    const income = Array(7).fill(0)
    const expense = Array(7).fill(0)
    for (const t of transactions) {
      const d = new Date(t.date)
      const diff = Math.floor((d.getTime() - startOfWeek.getTime()) / 86400000)
      if (diff >= 0 && diff < 7) {
        if (t.type === 'income') income[diff] += t.amount
        else expense[diff] += t.amount
      }
    }
    const max = Math.max(...income, ...expense, 1)
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
      day, incomeH: (income[i] / max) * 100, expenseH: (expense[i] / max) * 100,
    }))
  }, [transactions])

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Spending</h3>
        <div className="flex gap-1">
          {['Day', 'Week', 'Month'].map((t, i) => (
            <button key={t} className={cn('h-6 px-2.5 rounded-md text-[10px] font-semibold', i === 1 ? 'bg-foreground text-primary-foreground' : 'bg-muted text-muted-foreground')}>{t}</button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-[100px] pb-2 border-b border-border">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end justify-center" style={{ height: '80px' }}>
              <div className="w-full rounded-t-md rounded-b-sm min-h-[4px]" style={{ height: `${d.incomeH}%`, background: 'var(--chart-2, #34C759)' }} />
              <div className="w-full rounded-t-md rounded-b-sm min-h-[4px]" style={{ height: `${d.expenseH}%`, background: 'var(--chart-3, #FF6B6B)' }} />
            </div>
            <span className="text-[9px] font-semibold text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Transaction List ───
function TransactionList({ transactions, onViewAll }: { transactions: { id: string; type: 'income' | 'expense'; category: string; amount: number; description: string; date: string; wallet?: string }[]; onViewAll?: () => void }) {
  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = { food: '🍜', transport: '🚗', shopping: '🛍️', entertainment: '🎬', health: '💊', education: '📚', bills: '🧾', salary: '💼', freelance: '💻', investment: '📈', gifts: '🎁', other: '📌' }
    return icons[cat] || '📌'
  }
  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = { food: 'var(--red-bg)', transport: 'var(--blue-bg)', shopping: 'var(--purple-bg)', entertainment: 'var(--amber-bg)', health: 'var(--green-bg)', bills: 'var(--amber-bg)', salary: 'var(--green-bg)', freelance: 'var(--blue-bg)', investment: 'var(--purple-bg)' }
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
        {transactions.slice(0, 5).map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shadow-sm" style={{ background: getCategoryColor(tx.category) }}>{getCategoryIcon(tx.category)}</div>
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

// ─── Main Dashboard ───
export function DashboardV2() {
  const { transactions, wallets, goals, budgets, getTotalBalance, getWalletBalance, allCategories, hideBalance, toggleHideBalance } = useFinwise()
  const [activeNav, setActiveNav] = useState('home')
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

  const walletBalances = useMemo(() => wallets.map(w => ({ ...w, balance: getWalletBalance(w.id) })).filter(w => w.balance !== 0), [wallets, getWalletBalance])

  const recent = transactions.slice(0, 5).map(t => ({
    id: t.id, type: t.type as 'income' | 'expense', category: t.category, amount: t.amount,
    description: t.description || t.category, date: t.date, wallet: wallets.find(w => w.id === t.walletId)?.name,
  }))

  const services = [
    { icon: ArrowUpRight, label: 'Transfer', color: 'var(--green)' },
    { icon: ReceiptText, label: 'Bills', color: 'var(--primary)' },
    { icon: Target, label: 'Goals', color: 'var(--green)' },
    { icon: BarChart3, label: 'Budget', color: 'var(--primary)' },
    { icon: TrendingUp, label: 'Invest', color: 'var(--green)' },
    { icon: Lightbulb, label: 'AI Insight', color: 'var(--primary)' },
    { icon: CreditCard, label: 'Cards', color: 'var(--green)' },
    { icon: Wallet, label: 'Accounts', color: 'var(--primary)' },
  ]

  const formatBal = (n: number) => hideBalance ? '••••••' : formatIDRShort(n)

  // ─── Settings Screen ───
  if (currentScreen === 'settings') {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <div className="h-14 flex items-center gap-3 px-4 border-b border-border bg-card">
          <button onClick={() => setCurrentScreen('home')} className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <h1 className="text-lg font-extrabold text-foreground">Settings</h1>
        </div>
        <main className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><User className="w-6 h-6 text-muted-foreground" /></div>
            <div><h3 className="text-base font-bold text-foreground">San</h3><p className="text-xs text-primary font-semibold cursor-pointer">View profile →</p></div>
          </div>
          {[
            { icon: Settings, title: 'General', desc: 'Language, currency' },
            { icon: ReceiptText, title: 'Set up PIN', desc: 'Security & biometric' },
            { icon: BarChart3, title: 'Themes', desc: 'Warm, Stone, Sage, Slate, Rose' },
            { icon: Home, title: 'Dashboard', desc: 'Widget layout' },
            { icon: Bell, title: 'Notifications', desc: 'Alerts, reminders' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><item.icon className="w-5 h-5 text-muted-foreground" /></div>
              <div className="flex-1"><h4 className="text-sm font-bold text-foreground">{item.title}</h4><p className="text-[11px] text-muted-foreground">{item.desc}</p></div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          ))}
        </main>
        <div className="h-16 flex items-center justify-around border-t border-border bg-card">
          {[{ id: 'home', icon: Home, label: 'Home' }, { id: 'cards', icon: CreditCard, label: 'Cards' }, { id: 'tx', icon: ArrowDownUp, label: 'Tx' }, { id: 'profile', icon: User, label: 'Profile' }].map((item) => (
            <button key={item.id} onClick={() => { setActiveNav(item.id); if (item.id === 'home') setCurrentScreen('home'); if (item.id === 'profile') setCurrentScreen('settings'); }} className="flex flex-col items-center gap-0.5">
              <item.icon className={cn('w-5 h-5', activeNav === item.id ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-[9px] font-semibold', activeNav === item.id ? 'text-primary' : 'text-muted-foreground')}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Main Home Screen ───
  return (
    <div className="flex flex-col h-dvh bg-background">
      <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Balance</p>
          <p className="text-xl font-extrabold text-foreground tracking-tight tabular-nums">{formatBal(totalBalance)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleHideBalance} className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center">
            {hideBalance ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {[Wallet, CreditCard, TrendingUp, Plus].map((Icon, i) => (
            <button key={i} className="h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Services */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">Services</h3>
            <span className="text-xs font-semibold text-primary cursor-pointer">Edit</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {services.map((svc) => (
              <button key={svc.label} className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: svc.color === 'var(--green)' ? 'var(--green-bg)' : 'var(--primary-soft)' }}>
                  <svc.icon className="w-5 h-5" style={{ color: svc.color === 'var(--green)' ? 'var(--green)' : 'var(--primary)' }} />
                </div>
                <span className="text-[10px] font-semibold text-foreground">{svc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Income" value={formatIDRShort(income)} change={`+${Math.round(Math.random() * 20)}%`} changeType="up" />
          <StatCard label="Expense" value={formatIDRShort(expense)} change={`-${Math.round(Math.random() * 15)}%`} changeType="down" />
          <StatCard label="Saving Rate" value={`${savingRate}%`} change={`+${(Math.random() * 5).toFixed(1)}%`} changeType="up" />
          <StatCard label="Budget Used" value={`${budgetPct}%`} change={budgetPct < 80 ? 'Safe zone' : 'Warning'} changeType={budgetPct < 80 ? 'neutral' : 'down'} />
        </div>

        {/* Current Accounts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">Current Accounts</h3>
            <button onClick={() => setCurrentScreen('accounts')} className="text-xs font-semibold text-primary cursor-pointer">View All</button>
          </div>
          <div className="space-y-2">
            {walletBalances.slice(0, 2).map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--green-bg)' }}>
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
        <TransactionList transactions={recent} onViewAll={() => setCurrentScreen('accounts')} />
      </main>

      {/* Bottom Nav */}
      <div className="h-16 flex items-center justify-around border-t border-border bg-card">
        {[{ id: 'home', icon: Home, label: 'Home' }, { id: 'cards', icon: CreditCard, label: 'Cards' }, { id: 'tx', icon: ArrowDownUp, label: 'Tx' }, { id: 'profile', icon: User, label: 'Profile' }].map((item) => (
          <button key={item.id} onClick={() => { setActiveNav(item.id); if (item.id === 'profile') setCurrentScreen('settings'); }} className="flex flex-col items-center gap-0.5">
            <item.icon className={cn('w-5 h-5', activeNav === item.id ? 'text-primary' : 'text-muted-foreground')} />
            <span className={cn('text-[9px] font-semibold', activeNav === item.id ? 'text-primary' : 'text-muted-foreground')}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

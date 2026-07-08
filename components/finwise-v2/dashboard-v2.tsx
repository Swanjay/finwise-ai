'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFinwise } from '@/components/finwise-store'
import { formatIDR, formatIDRShort, summarize, spendingByCategory, filterByMonth, getMonthKey } from '@/lib/finwise'
import {
  StatCard, StatGrid, CashflowChart, TransactionList,
  CalendarWidget, TodoWidget, AccountSummary, AIInsight,
  SidebarNav, MobileBottomNav, DesktopSidebar, HeaderBar,
} from '@/components/finwise-v2'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function DashboardV2() {
  const { data: session } = useSession()
  const router = useRouter()
  const {
    transactions, wallets, goals, budgets,
    getTotalBalance, getWalletBalance, allCategories,
  } = useFinwise()

  const [activeNav, setActiveNav] = useState('dashboard')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Current month transactions
  const monthKey = getMonthKey(new Date())
  const monthTransactions = useMemo(
    () => filterByMonth(transactions, monthKey),
    [transactions, monthKey]
  )
  const { income, expense, surplus } = summarize(monthTransactions)
  const totalBalance = getTotalBalance()
  const savingRate = income > 0 ? Math.round((surplus / income) * 100) : 0

  // Budget
  const totalBudgetLimit = useMemo(
    () => Object.values(budgets).reduce<number>((sum, v) => sum + (v ?? 0), 0),
    [budgets]
  )
  const budgetPct = totalBudgetLimit > 0 ? Math.min(Math.round((expense / totalBudgetLimit) * 100), 100) : 0

  // Wallet balances
  const walletBalances = useMemo(
    () => wallets.map(w => ({ ...w, balance: getWalletBalance(w.id) })).filter(w => w.balance !== 0),
    [wallets, getWalletBalance]
  )

  // Categories for donut
  const byCat = spendingByCategory(monthTransactions, allCategories)
  const donutCategories = byCat.slice(0, 5).map((c, i) => ({
    name: c.category.label,
    amount: c.value,
    color: ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'][i] || 'var(--muted)',
  }))

  // Recent transactions
  const recent = transactions.slice(0, 5).map(t => ({
    id: t.id,
    type: t.type as 'income' | 'expense',
    category: t.category,
    amount: t.amount,
    description: t.description || t.category,
    date: t.date,
    wallet: wallets.find(w => w.id === t.walletId)?.name,
  }))

  // Goals
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0)
  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
  const savingsPct = totalGoalTarget > 0 ? Math.round((totalSaved / totalGoalTarget) * 100) : 0

  // AI Insight messages
  const topCat = byCat[0]
  const aiMessage = topCat
    ? `Your ${topCat.category.label.toLowerCase()} spending is ${Math.round((topCat.value / (expense || 1)) * 100)}% of total. ${(topCat.value / (expense || 1)) * 100 > 30 ? 'Consider reducing to stay under budget.' : 'Looking good!'}`
    : 'Add transactions to get personalized insights.'

  const goalMessage = goals.length > 0
    ? `You're ${savingsPct}% towards your savings goals. ${savingsPct < 50 ? 'Move more from unused budget to reach faster.' : 'Great progress! Keep it up!'}`
    : 'Set up savings goals to track your progress.'

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh bg-background">
        <HeaderBar />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stats */}
          <StatGrid>
            <StatCard label="Income" value={formatIDRShort(income)} change={`+${Math.round(Math.random() * 20)}%`} changeType="up" />
            <StatCard label="Expense" value={formatIDRShort(expense)} change={`-${Math.round(Math.random() * 15)}%`} changeType="down" />
            <StatCard label="Saving Rate" value={`${savingRate}%`} change={`+${(Math.random() * 5).toFixed(1)}%`} changeType="up" />
            <StatCard label="Budget Used" value={`${budgetPct}%`} change={budgetPct < 80 ? 'Safe zone' : 'Warning'} changeType={budgetPct < 80 ? 'neutral' : 'down'} />
          </StatGrid>

          {/* Cashflow */}
          <CashflowChart transactions={monthTransactions} />

          {/* Transactions */}
          <TransactionList transactions={recent} onViewAll={() => router.push('/')} />

          {/* AI Insight */}
          <AIInsight message={aiMessage} />
          <AIInsight type="goal" message={goalMessage} />
        </main>
        <MobileBottomNav activeId={activeNav} onNavigate={setActiveNav} />
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      <DesktopSidebar activeId={activeNav} onNavigate={setActiveNav} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <HeaderBar />

        <main className="flex-1 grid grid-cols-[240px_1fr_260px] gap-3 p-3 overflow-auto">
          {/* Left Panel */}
          <div className="flex flex-col gap-2">
            <div className="bg-card rounded-2xl p-3 border border-border shadow-sm">
              <h2 className="text-sm font-bold text-foreground mb-2">Navigation</h2>
              <SidebarNav activeId={activeNav} onNavigate={setActiveNav} />
            </div>
            <div className="bg-card rounded-2xl p-3 border border-border shadow-sm">
              <h3 className="text-xs font-bold text-foreground mb-2">Accounts</h3>
              {walletBalances.map((w) => (
                <div key={w.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-xs">💳</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{w.name}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground">{formatIDRShort(w.balance)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Panel */}
          <div className="flex flex-col gap-2">
            <StatGrid>
              <StatCard label="Income" value={formatIDRShort(income)} change={`+${Math.round(Math.random() * 20)}%`} changeType="up" />
              <StatCard label="Expense" value={formatIDRShort(expense)} change={`-${Math.round(Math.random() * 15)}%`} changeType="down" />
              <StatCard label="Saving Rate" value={`${savingRate}%`} change={`+${(Math.random() * 5).toFixed(1)}%`} changeType="up" />
              <StatCard label="Budget Used" value={`${budgetPct}%`} change={budgetPct < 80 ? 'Safe' : 'Warning'} changeType={budgetPct < 80 ? 'neutral' : 'down'} />
            </StatGrid>
            <CashflowChart transactions={monthTransactions} />
            <TransactionList transactions={recent} onViewAll={() => router.push('/')} />
          </div>

          {/* Right Panel */}
          <div className="flex flex-col gap-2">
            <div className="bg-card rounded-2xl p-3 border border-border shadow-sm text-center">
              <ClockWidget />
            </div>
            <CalendarWidget />
            <AIInsight message={aiMessage} />
            <AccountSummary totalBalance={totalBalance} categories={donutCategories} />
            <TodoWidget />
          </div>
        </main>
      </div>
    </div>
  )
}

function ClockWidget() {
  const [time, setTime] = useState('--:--')
  const [date, setDate] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = now.getHours() % 12 || 12
      const m = String(now.getMinutes()).padStart(2, '0')
      setTime(`${h}:${m}`)

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      setDate(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div className="text-3xl font-extrabold text-foreground tracking-tight tabular-nums">{time}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{date}</div>
    </>
  )
}

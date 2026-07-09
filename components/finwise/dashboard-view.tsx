'use client'

import { useCallback, useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, TrendingUp, Wallet, ShieldCheck, PiggyBank, Sparkles, Heart } from 'lucide-react'
import { formatIDR, formatIDRShort, spendingByCategory, summarize, type Transaction, type Goal } from '@/lib/finwise'
import { detectLogo } from '@/lib/brand-logos'
import { useFinwise } from '@/components/finwise-store'
import { SpendingDonut } from './spending-donut'
import { BudgetProgress } from './budget-progress'
import { TransactionRow } from './transaction-row'
import { EmptyState } from './mascot'
import { LevelBadge, useGamification } from './gamification'
import Image from 'next/image'
import { CashflowChart } from './cashflow-chart'
import { TopSpending } from './top-spending'
import { UpcomingBills } from './upcoming-bills'
import { BarChart3, PieChart, Target, CalendarClock, ChevronRight } from 'lucide-react'
import { AnimatedIDR, AnimatedIDRShort } from './animated-number'
import { PullToRefresh } from './pull-to-refresh'
import { StaggerList, StaggerItem } from './stagger-list'
import { PressableCard, PressEffect } from './pressable-card'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const PLAN_BADGE: Record<string, { emoji: string; name: string }> = {
  basic: { emoji: '🆓', name: 'Basic' },
  pro: { emoji: '💎', name: 'Pro' },
  premium: { emoji: '👑', name: 'Premium' },
}

export function DashboardView({ transactions, month, onOpenGoals, onOpenWallets, onOpenAdd, onOpenReports }: { transactions: Transaction[]; month: string; onOpenGoals?: () => void; onOpenWallets?: () => void; onOpenAdd?: () => void; onOpenReports?: () => void }) {
  const { allCategories, hideBalance, toggleHideBalance, getTotalBalance, recurring, budgets, goals, wallets, getWalletBalance, plan } = useFinwise()
  const { stats } = useGamification()
  const planBadge = PLAN_BADGE[plan] || PLAN_BADGE.basic
  const { income, expense, surplus } = summarize(transactions)
  const totalBalance = getTotalBalance()
  const positive = totalBalance >= 0
  const byCat = spendingByCategory(transactions, allCategories)

  const spentMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount)
  }

  const totalBudgetLimit = useMemo(() => {
    return Object.values(budgets).reduce<number>((sum, v) => sum + (v ?? 0), 0)
  }, [budgets])
  const sisaBudget = totalBudgetLimit - expense
  const budgetPct = totalBudgetLimit > 0 ? Math.min(Math.round((expense / totalBudgetLimit) * 100), 100) : 0

  const walletBalances = useMemo(() => {
    return wallets.map(w => ({
      ...w,
      balance: getWalletBalance(w.id),
    })).filter(w => w.balance !== 0)
  }, [wallets, getWalletBalance])

  const totalSaved = useMemo(() => goals.reduce((s, g) => s + g.currentAmount, 0), [goals])
  const totalGoalTarget = useMemo(() => goals.reduce((s, g) => s + g.targetAmount, 0), [goals])
  const savingsPct = totalGoalTarget > 0 ? Math.round((totalSaved / totalGoalTarget) * 100) : 0

  const recent = transactions.slice(0, 5)

  // Top spending category
  const topCat = useMemo(() => {
    if (byCat.length === 0) return null
    return byCat[0]
  }, [byCat])

  // Weekly sparkline data (last 7 days)
  const weeklyData = useMemo(() => {
    const days: number[] = Array(7).fill(0)
    const now = new Date()
    for (const t of transactions) {
      if (t.type !== 'expense' || !t.date) continue
      const d = new Date(t.date)
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
      if (diff >= 0 && diff < 7) {
        days[6 - diff] += t.amount
      }
    }
    return days
  }, [transactions])
  const maxWeekly = Math.max(...weeklyData, 1)

  // Upcoming bills count
  const upcomingCount = recurring.filter(r => r.active).length

  // Health score
  const healthScore = useMemo(() => {
    let score = 50
    if (surplus > 0) score += 20
    if (totalBudgetLimit > 0 && sisaBudget >= 0) score += 15
    if (goals.length > 0 && savingsPct > 20) score += 10
    if (transactions.length > 10) score += 5
    return Math.min(score, 100)
  }, [surplus, totalBudgetLimit, sisaBudget, goals.length, savingsPct, transactions.length])

  const handleRefresh = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 600))
    window.dispatchEvent(new Event('storage'))
  }, [])

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="flex flex-col gap-4">

        {/* ─── Level & XP Badge ─── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex items-center justify-between"
        >
          <LevelBadge stats={stats} />
          {/* Plan Badge */}
          <div className="flex items-center gap-2">
            <Link href="/pricing" className="flex items-center gap-1.5 text-xs font-semibold bg-secondary px-2.5 py-1 rounded-full hover:bg-primary/10 transition">
              {planBadge.emoji} <span>{planBadge.name}</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </motion.div>

        {/* ─── Balance Hero Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05, type: 'spring', stiffness: 200, damping: 20 }}
          className="clay-card-sage p-5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Wallet className="size-4 text-primary" />
              Total Saldo
            </div>
            <PressEffect>
              <button onClick={toggleHideBalance} className="text-muted-foreground hover:text-primary transition">
                {hideBalance ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </PressEffect>
          </div>
          <AnimatedIDR
            value={totalBalance}
            hidden={hideBalance}
            className={`text-3xl font-bold font-heading ${positive ? 'text-foreground' : 'text-destructive'}`}
          />
          <div className="flex items-center gap-2 mt-2">
            {surplus >= 0 ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                <ArrowUpRight className="size-3" />
                +{hideBalance ? '••••' : formatIDRShort(surplus)}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                <ArrowDownRight className="size-3" />
                {hideBalance ? '••••' : formatIDRShort(Math.abs(surplus))}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">dari bulan lalu</span>
          </div>
          {/* Quick actions */}
          <div className="flex gap-2 mt-4">
            <button onClick={() => onOpenAdd?.()} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition active:scale-95">
              + Tambah
            </button>
            <button onClick={() => onOpenReports?.()} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 transition active:scale-95">
              📊 Laporan
            </button>
          </div>
        </motion.div>

        {/* ─── Quick Stats (3 columns) ─── */}
        <motion.div
          className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-2"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
          }}
        >
          <PressableCard className="clay-card-green p-3 text-center" pressScale={0.95}>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <div className="text-lg mb-1">📈</div>
              <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                {hideBalance ? '••••' : formatIDRShort(income)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Pemasukan</p>
            </motion.div>
          </PressableCard>
          <PressableCard className="clay-card-pink p-3 text-center" pressScale={0.95}>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <div className="text-lg mb-1">📉</div>
              <p className="font-bold text-sm text-red-500 dark:text-red-400 tabular-nums">
                {hideBalance ? '••••' : formatIDRShort(expense)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Pengeluaran</p>
            </motion.div>
          </PressableCard>
          <PressableCard className={cn('p-3 text-center', surplus >= 0 ? 'clay-card-blue' : 'clay-card-pink')} pressScale={0.95}>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <div className="text-lg mb-1">💰</div>
              <p className={cn('font-bold text-sm tabular-nums', surplus >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400')}>
                {hideBalance ? '••••' : formatIDRShort(Math.abs(surplus))}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Surplus</p>
            </motion.div>
          </PressableCard>
        </motion.div>

        {/* ─── AI Insight Card ─── */}
        {transactions.length > 3 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10"
          >
            <Sparkles className="size-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-foreground/80">
              <strong className="text-primary">AI Insight:</strong>{' '}
              {surplus > 0
                ? `Keren! Kamu surplus ${formatIDRShort(surplus)} bulan ini. Pertahankan! 💪`
                : `Pengeluaran melebihi pemasukan ${formatIDRShort(Math.abs(surplus))}. Coba kurangi kategori ${topCat?.category.label || 'terbesar'}.`}
            </p>
          </motion.div>
        )}

        {/* ─── Grid Feed (2 columns) ─── */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
          }}
        >
          {/* Budget Ring Card */}
          {totalBudgetLimit > 0 && (
            <PressableCard className="clay-card-yellow p-4 flex flex-col items-center" pressScale={0.95}>
              <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }} className="flex flex-col items-center">
                <div className="text-lg mb-2">🎯</div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Budget</p>
                {/* Ring */}
                <div className="relative w-14 h-14 mb-2">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4"
                      strokeDasharray={`${budgetPct * 1.508} 150.8`}
                      strokeLinecap="round"
                      className={cn(budgetPct > 80 ? 'text-red-500' : budgetPct > 50 ? 'text-amber-500' : 'text-emerald-500')}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{budgetPct}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  {hideBalance ? '••••' : formatIDRShort(expense)} / {formatIDRShort(totalBudgetLimit)}
                </p>
              </motion.div>
            </PressableCard>
          )}

          {/* Weekly Trend Sparkline */}
          <PressableCard className="clay-card p-4 flex flex-col" pressScale={0.95}>
            <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }} className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg">📊</div>
                <span className="text-[10px] font-semibold text-muted-foreground">7 hari</span>
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Tren Mingguan</p>
              {/* Sparkline bars */}
              <div className="flex items-end gap-1 h-8 flex-1">
                {weeklyData.map((val, i) => (
                  <div key={i} className="flex-1 rounded-sm min-h-[3px] transition-all"
                    style={{
                      height: `${Math.max((val / maxWeekly) * 100, 8)}%`,
                      backgroundColor: i === 6 ? 'var(--primary)' : undefined,
                      opacity: i === 6 ? 1 : 0.5,
                    }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Rata-rata {hideBalance ? '••••' : formatIDRShort(weeklyData.reduce((s, v) => s + v, 0) / 7)}/hari
              </p>
            </motion.div>
          </PressableCard>
        </motion.div>

        {/* ─── Wallet Breakdown (Full Width) ─── */}
        {walletBalances.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <PressableCard className="clay-card p-4" pressScale={0.985} onClick={onOpenWallets}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Wallet className="size-4 text-primary" />
                  Saldo per Dompet
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  {walletBalances.length} dompet
                </span>
              </div>
              <div className="flex gap-3">
                {walletBalances.slice(0, 3).map((w, i) => (
                  <div key={w.id} className="flex-1 text-center">
                    {i > 0 && <div className="hidden" />}
                    <div className="text-base mb-1">
                      {detectLogo(w.name) ? (
                        <img src={detectLogo(w.name)} alt="" className="w-6 h-6 mx-auto object-contain dark:rounded-md dark:bg-white/20 dark:p-0.5" />
                      ) : (
                        w.icon
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{w.name}</p>
                    <p className="text-xs font-bold tabular-nums truncate">{hideBalance ? '••••' : formatIDR(w.balance)}</p>
                  </div>
                ))}
              </div>
            </PressableCard>
          </motion.div>
        )}

        {/* ─── Grid Feed Row 2 ─── */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
          }}
        >
          {/* Top Category */}
          {topCat && (
            <PressableCard className="clay-card p-4" pressScale={0.95}>
              <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
                <div className="mb-2"><topCat.category.icon className="size-5" style={{ color: topCat.category.color }} /></div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Top Kategori</p>
                <p className="text-xs font-bold text-foreground truncate">{topCat.category.label}</p>
                <p className="text-sm font-bold tabular-nums mt-1" style={{ color: topCat.category.color }}>
                  {hideBalance ? '••••' : formatIDRShort(topCat.value)}
                </p>
              </motion.div>
            </PressableCard>
          )}

          {/* Savings Goal Progress */}
          {goals.length > 0 && (
            <PressableCard className="clay-card p-4" pressScale={0.95} onClick={onOpenGoals}>
              <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}>
                <div className="text-lg mb-2">🎯</div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Target Tabungan</p>
                <p className="text-sm font-bold text-foreground">{savingsPct}%</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary mt-2">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(savingsPct, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {hideBalance ? '••••' : formatIDRShort(totalSaved)} / {formatIDRShort(totalGoalTarget)}
                </p>
              </motion.div>
            </PressableCard>
          )}
        </motion.div>

        {/* ─── Upcoming Bills (Full Width) ─── */}
        {recurring.filter(r => r.active).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <PressableCard className="clay-card p-4" pressScale={0.985}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  Tagihan Mendatang
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500">
                  {upcomingCount} segera
                </span>
              </div>
              <UpcomingBills recurring={recurring} allCategories={allCategories} />
            </PressableCard>
          </motion.div>
        )}

        {/* ─── Health Score Widget ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <PressableCard className="clay-card p-4 flex items-center gap-4" pressScale={0.985}>
            {/* Score Ring */}
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
                <circle cx="28" cy="28" r="24" fill="none" strokeWidth="4"
                  strokeDasharray={`${(healthScore / 100) * 150.8} 150.8`}
                  strokeLinecap="round"
                  className={healthScore >= 70 ? 'text-emerald-500' : healthScore >= 40 ? 'text-amber-500' : 'text-red-500'}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-base font-bold">{healthScore}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Heart className="size-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">
                  {healthScore >= 70 ? 'Keuangan Sehat! 🎉' : healthScore >= 40 ? 'Perlu Perhatian ⚠️' : 'Awas! 🚨'}
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {healthScore >= 70
                  ? 'Surplus positif, budget terkontrol. Pertahankan!'
                  : 'Coba kurangi pengeluaran dan tingkatkan tabungan.'}
              </p>
            </div>
          </PressableCard>
        </motion.div>

        {/* ─── Goals Horizontal Scroll ─── */}
        {goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <div className="flex items-center justify-between px-1 mb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <PiggyBank className="size-4 text-primary" />
                Goals
              </h3>
              {goals.length > 3 && (
                <button onClick={onOpenGoals} className="text-xs text-primary font-semibold">
                  Semua →
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
              {goals.slice(0, 5).map((g) => {
                const pct = g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0
                return (
                  <PressableCard
                    key={g.id}
                    className="min-w-[140px] p-3.5"
                    pressScale={0.95}
                    onClick={onOpenGoals}
                  >
                    <div className="text-lg mb-2">{g.icon}</div>
                    <p className="text-xs font-bold text-foreground truncate">{g.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {hideBalance ? '••••' : formatIDRShort(g.currentAmount)} / {formatIDRShort(g.targetAmount)}
                    </p>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-secondary mt-2">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                    </div>
                  </PressableCard>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ─── Cashflow Chart ─── */}
        <PressableCard
          className="clay-card p-4"
          pressScale={0.985}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          <h3 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            Cashflow Bulanan
          </h3>
          <CashflowChart transactions={transactions} month={month} hideBalance={hideBalance} />
        </PressableCard>

        {/* ─── Spending Donut ─── */}
        {byCat.length > 0 && (
          <PressableCard
            className="clay-card p-4"
            pressScale={0.985}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h3 className="font-heading text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary inline-block" />
              Pengeluaran per Kategori
            </h3>
            <SpendingDonut data={byCat} hideBalance={hideBalance} />
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {byCat.slice(0, 6).map(({ category, value }) => (
                <li key={category.id} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                  <span className="truncate text-muted-foreground">{category.label}</span>
                  <span className="ml-auto tabular-nums font-medium text-foreground">{hideBalance ? '••••' : formatIDR(value)}</span>
                </li>
              ))}
            </ul>
          </PressableCard>
        )}

        {/* ─── Recent Transactions (staggered) ─── */}
        <motion.div
          className="clay-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
        >
          <h3 className="font-heading text-sm font-bold text-foreground mb-3">
            Transaksi Terakhir
          </h3>
          {recent.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Yuk catat transaksi pertamamu! 🚀"
            />
          ) : (
            <StaggerList className="-mx-2 flex flex-col" delay={0.7}>
              {recent.map((tx) => (
                <StaggerItem key={tx.id}>
                  <TransactionRow tx={tx} hideBalance={hideBalance} />
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </motion.div>

      </div>
    </PullToRefresh>
  )
}

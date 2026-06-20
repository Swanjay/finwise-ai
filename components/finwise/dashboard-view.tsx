'use client'

import { useCallback, useMemo } from 'react'
import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, TrendingUp, Wallet, ShieldCheck, PiggyBank } from 'lucide-react'
import { formatIDR, formatIDRShort, spendingByCategory, summarize, type Transaction, type Goal } from '@/lib/finwise'
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

export function DashboardView({ transactions, month, onOpenGoals, onOpenWallets }: { transactions: Transaction[]; month: string; onOpenGoals?: () => void; onOpenWallets?: () => void }) {
  const { allCategories, hideBalance, toggleHideBalance, getTotalBalance, recurring, budgets, goals, wallets, getWalletBalance } = useFinwise()
  const { stats } = useGamification()
  const { income, expense, surplus } = summarize(transactions)
  const totalBalance = getTotalBalance()
  const positive = totalBalance >= 0
  const byCat = spendingByCategory(transactions, allCategories)

  const spentMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount)
  }

  // Compute Sisa Budget: total budget limit - total expenses
  const totalBudgetLimit = useMemo(() => {
    return Object.values(budgets).reduce<number>((sum, v) => sum + (v ?? 0), 0)
  }, [budgets])
  const sisaBudget = totalBudgetLimit - expense

  // Wallet balances for the compact breakdown
  const walletBalances = useMemo(() => {
    return wallets.map(w => ({
      ...w,
      balance: getWalletBalance(w.id),
    })).filter(w => w.balance !== 0) // Only show wallets with activity
  }, [wallets, getWalletBalance])

  // Savings goals summary
  const totalSaved = useMemo(() => goals.reduce((s, g) => s + g.currentAmount, 0), [goals])
  const totalGoalTarget = useMemo(() => goals.reduce((s, g) => s + g.targetAmount, 0), [goals])
  const savingsPct = totalGoalTarget > 0 ? Math.round((totalSaved / totalGoalTarget) * 100) : 0

  const recent = transactions.slice(0, 5)

  // Pull-to-refresh handler: reloads data from localStorage
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
        >
          <LevelBadge stats={stats} />
        </motion.div>

        {/* ─── Welcome Banner ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05, type: 'spring', stiffness: 200, damping: 20 }}
          className="clay-card-purple p-4 flex items-center gap-3 relative overflow-hidden"
        >
          <Image
            src="/mascot-64.png"
            alt="FinWise Cat"
            width={64}
            height={64}
            className="shrink-0 drop-shadow-md animate-bounce-soft"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary/70">Halo! 👋</p>
            <h2 className="font-heading text-base font-bold text-[#2D2057]">Keuangan {month}</h2>
            <p className="text-xs text-primary/60 mt-0.5">Tetap semangat mengelola uang! 💪</p>
          </div>
          <div className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {positive ? '✓ Sehat' : '⚠ Defisit'}
          </div>
        </motion.div>

        {/* ─── Balance Card (with counting animation) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
          className="clay-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Wallet className="size-4 text-primary" />
              Total Saldo Semua Dompet
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
            className={`text-3xl font-bold font-heading ${positive ? 'text-[#2D2057]' : 'text-destructive'}`}
          />
        </motion.div>

        {/* ─── Stats Cards (2×2 grid with Sisa Budget) ─── */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
          }}
        >
          {/* Pemasukan */}
          <PressableCard className="clay-card-green p-3 flex flex-col gap-1" pressScale={0.95}>
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
              }}
              className="flex flex-col gap-1"
            >
              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                <ArrowUpRight className="size-3.5" />
                Masuk
              </div>
              <p className="font-bold text-sm text-emerald-600 tabular-nums leading-tight">
                {hideBalance ? '••••' : <AnimatedIDRShort value={income} className="inline" />}
              </p>
            </motion.div>
          </PressableCard>

          {/* Pengeluaran */}
          <PressableCard className="clay-card-pink p-3 flex flex-col gap-1" pressScale={0.95}>
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
              }}
              className="flex flex-col gap-1"
            >
              <div className="flex items-center gap-1 text-[10px] font-semibold text-red-500">
                <ArrowDownRight className="size-3.5" />
                Keluar
              </div>
              <p className="font-bold text-sm text-red-500 tabular-nums leading-tight">
                {hideBalance ? '••••' : <AnimatedIDRShort value={expense} className="inline" />}
              </p>
            </motion.div>
          </PressableCard>

          {/* Sisa Saldo */}
          <PressableCard
            className={`p-3 flex flex-col gap-1 ${positive ? 'clay-card-blue' : 'clay-card-pink'}`}
            pressScale={0.95}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
              }}
              className="flex flex-col gap-1"
            >
              <div className={`flex items-center gap-1 text-[10px] font-semibold ${positive ? 'text-blue-600' : 'text-red-500'}`}>
                <Wallet className="size-3.5" />
                Sisa Saldo
              </div>
              <p className={`font-bold text-sm tabular-nums leading-tight ${positive ? 'text-blue-600' : 'text-red-500'}`}>
                {hideBalance ? '••••' : <AnimatedIDRShort value={surplus} className="inline" />}
              </p>
            </motion.div>
          </PressableCard>

          {/* ✨ Sisa Budget (NEW!) */}
          {totalBudgetLimit > 0 && (
            <PressableCard
              className={cn('p-3 flex flex-col gap-1', sisaBudget >= 0 ? 'clay-card-yellow' : 'clay-card-pink')}
              pressScale={0.95}
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 12, scale: 0.95 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
                }}
                className="flex flex-col gap-1"
              >
                <div className={cn('flex items-center gap-1 text-[10px] font-semibold', sisaBudget >= 0 ? 'text-amber-600' : 'text-red-500')}>
                  <ShieldCheck className="size-3.5" />
                  Sisa Budget
                </div>
                <p className={cn('font-bold text-sm tabular-nums leading-tight', sisaBudget >= 0 ? 'text-amber-600' : 'text-red-500')}>
                  {hideBalance ? '••••' : <AnimatedIDRShort value={sisaBudget} className="inline" />}
                </p>
              </motion.div>
            </PressableCard>
          )}
        </motion.div>

        {/* ─── ✨ Wallet Breakdown (NEW!) ─── */}
        {walletBalances.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <PressableCard
              className="clay-card p-4"
              pressScale={0.985}
              onClick={onOpenWallets}
            >
              <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3 flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                Total Saldo Semua Dompet
                <span className="ml-auto font-extrabold text-base tabular-nums">
                  {hideBalance ? '••••' : formatIDR(totalBalance)}
                </span>
              </h3>
              <div className="flex flex-col gap-2.5">
                {walletBalances.map((w, i) => (
                  <div key={w.id}>
                    {i > 0 && <div className="h-px bg-border mb-2.5" />}
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center shrink-0 size-9 rounded-[10px] text-lg"
                        style={{ backgroundColor: `${w.color}20`, color: w.color }}
                      >
                        {w.logo ? (
                          <Image src={w.logo} alt={w.name} width={20} height={20} className="object-contain" />
                        ) : (
                          <span>{w.icon}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#2D2057] truncate">{w.name}</p>
                      </div>
                      <p className={cn('font-extrabold text-sm tabular-nums', w.balance >= 0 ? 'text-[#2D2057]' : 'text-destructive')}>
                        {hideBalance ? '••••' : formatIDR(w.balance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </PressableCard>
          </motion.div>
        )}

        {/* ─── ✨ Savings Goals Widget (NEW!) ─── */}
        {goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
          >
            <PressableCard
              className="clay-card p-4"
              pressScale={0.985}
              onClick={onOpenGoals}
            >
              <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-1 flex items-center gap-2">
                <PiggyBank className="size-4 text-primary" />
                Total Tabungan Terkumpul
                <span className="ml-auto font-extrabold text-base text-primary tabular-nums">
                  {hideBalance ? '••••' : formatIDR(totalSaved)}
                </span>
              </h3>
              {totalGoalTarget > 0 && (
                <>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    dari target {formatIDRShort(totalGoalTarget)} · <span className="font-bold text-primary">{savingsPct}%</span>
                  </p>
                  {/* Overall progress bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary mb-3">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(savingsPct, 100)}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </>
              )}
              {/* Individual goals (max 3) */}
              <div className="flex flex-col gap-3">
                {goals.slice(0, 3).map((g) => {
                  const pct = g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0
                  return (
                    <div key={g.id} className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center shrink-0 size-10 rounded-xl text-lg"
                        style={{ backgroundColor: `${g.color}20`, color: g.color }}
                      >
                        {g.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-[#2D2057] truncate">{g.name}</p>
                          <p className="text-xs font-bold text-primary tabular-nums ml-2">
                            {hideBalance ? '••••' : formatIDRShort(g.currentAmount)}
                          </p>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.color }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {pct}% · Target {formatIDRShort(g.targetAmount)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              {goals.length > 3 && (
                <button className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition">
                  Lihat semua target ({goals.length}) →
                </button>
              )}
            </PressableCard>
          </motion.div>
        )}

        {/* ─── Cashflow Chart ─── */}
        <PressableCard
          className="clay-card p-4"
          pressScale={0.985}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3 flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            Cashflow Bulanan
          </h3>
          <CashflowChart transactions={transactions} month={month} />
        </PressableCard>

        {/* ─── Spending Donut ─── */}
        {byCat.length > 0 && (
          <PressableCard
            className="clay-card p-4"
            pressScale={0.985}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38 }}
          >
            <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3 flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary inline-block" />
              Pengeluaran per Kategori
            </h3>
            <SpendingDonut data={byCat} />
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {byCat.slice(0, 6).map(({ category, value }) => (
                <li key={category.id} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                  <span className="truncate text-muted-foreground">{category.label}</span>
                  <span className="ml-auto tabular-nums font-medium text-[#2D2057]">{formatIDR(value)}</span>
                </li>
              ))}
            </ul>
          </PressableCard>
        )}

        {/* ─── Top Spending Categories ─── */}
        <PressableCard
          className="clay-card p-4"
          pressScale={0.985}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.46 }}
        >
          <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3 flex items-center gap-2">
            <PieChart className="size-4 text-primary" />
            Top Pengeluaran
          </h3>
          <TopSpending transactions={transactions} allCategories={allCategories} />
        </PressableCard>

        {/* ─── Budget Progress ─── */}
        <PressableCard
          className="clay-card-purple p-4"
          pressScale={0.985}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.54 }}
        >
          <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3 flex items-center gap-2">
            <Target className="size-4 text-primary" />
            Progres Anggaran
          </h3>
          <BudgetProgress spentByCat={spentMap} />
        </PressableCard>

        {/* ─── Upcoming Bills ─── */}
        <PressableCard
          className="clay-card p-4"
          pressScale={0.985}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.62 }}
        >
          <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3 flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            Tagihan Mendatang
          </h3>
          <UpcomingBills recurring={recurring} allCategories={allCategories} />
        </PressableCard>

        {/* ─── Recent Transactions (staggered) ─── */}
        <motion.div
          className="clay-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h3 className="font-heading text-sm font-bold text-[#2D2057] mb-3">
            Transaksi Terakhir
          </h3>
          {recent.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Yuk catat transaksi pertamamu! 🚀"
            />
          ) : (
            <StaggerList className="-mx-2 flex flex-col" delay={0.75}>
              {recent.map((tx) => (
                <StaggerItem key={tx.id}>
                  <TransactionRow tx={tx} />
                </StaggerItem>
              ))}
            </StaggerList>
          )}
        </motion.div>

      </div>
    </PullToRefresh>
  )
}

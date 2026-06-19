'use client'

import { useCallback } from 'react'
import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, TrendingUp, Wallet } from 'lucide-react'
import { formatIDR, spendingByCategory, summarize, type Transaction } from '@/lib/finwise'
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
import { BarChart3, PieChart, Target, CalendarClock } from 'lucide-react'
import { AnimatedIDR, AnimatedIDRShort } from './animated-number'
import { PullToRefresh } from './pull-to-refresh'
import { StaggerList, StaggerItem } from './stagger-list'
import { PressableCard, PressEffect } from './pressable-card'
import { motion } from 'framer-motion'

export function DashboardView({ transactions, month }: { transactions: Transaction[]; month: string }) {
  const { allCategories, hideBalance, toggleHideBalance, getTotalBalance, recurring } = useFinwise()
  const { stats } = useGamification()
  const { income, expense, surplus } = summarize(transactions)
  const totalBalance = getTotalBalance()
  const positive = totalBalance >= 0
  const byCat = spendingByCategory(transactions, allCategories)

  const spentMap = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense') spentMap.set(t.category, (spentMap.get(t.category) ?? 0) + t.amount)
  }

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

        {/* ─── Stats Cards (staggered) ─── */}
        <motion.div
          className="grid grid-cols-3 gap-3"
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
              <div className="flex items-center gap-1 text-[10px] font-semibold text-green-700">
                <ArrowUpRight className="size-3.5" />
                Masuk
              </div>
              <p className="font-bold text-sm text-[#2D2057] tabular-nums leading-tight">
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
              <p className="font-bold text-sm text-[#2D2057] tabular-nums leading-tight">
                {hideBalance ? '••••' : <AnimatedIDRShort value={expense} className="inline" />}
              </p>
            </motion.div>
          </PressableCard>

          {/* Surplus */}
          <PressableCard
            className={`p-3 flex flex-col gap-1 ${surplus >= 0 ? 'clay-card-blue' : 'clay-card-pink'}`}
            pressScale={0.95}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 12, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
              }}
              className="flex flex-col gap-1"
            >
              <div className={`flex items-center gap-1 text-[10px] font-semibold ${surplus >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                <TrendingUp className="size-3.5" />
                Surplus
              </div>
              <p className="font-bold text-sm text-[#2D2057] tabular-nums leading-tight">
                {hideBalance ? '••••' : <AnimatedIDRShort value={surplus} className="inline" />}
              </p>
            </motion.div>
          </PressableCard>
        </motion.div>

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

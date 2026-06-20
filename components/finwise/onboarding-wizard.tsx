'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXPENSE_CATEGORIES } from '@/lib/finwise'
import { FinWiseMascot } from '@/components/finwise/mascot'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Storage key ───
const SETUP_KEY = 'fw.setupDone.v1'
const SELECTED_CATS_KEY = 'fw.onboarding.cats'
const FIRST_WALLET_KEY = 'fw.onboarding.wallet'
const INCOME_KEY = 'fw.onboarding.income'

// ─── Confetti Component ───
function Confetti() {
  const [particles, setParticles] = useState<Array<{
    id: number; x: number; color: string; delay: number; rotate: number; size: number
  }>>([])

  useEffect(() => {
    const colors = ['#8A6ECF', '#F9A8D4', '#F97316', '#4CAF50', '#5B9BD5', '#EC4899', '#EAB308', '#14B8A6']
    const newParticles = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.8,
      rotate: Math.random() * 720 - 360,
      size: Math.random() * 8 + 4,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: '110vh',
            rotate: p.rotate,
            opacity: [1, 1, 0],
            scale: [1, 1.2, 0.5],
          }}
          transition={{
            duration: 2.5 + Math.random(),
            delay: p.delay,
            ease: 'easeIn',
          }}
          className="absolute top-0 rounded-sm"
          style={{
            width: p.size,
            height: p.size * (Math.random() > 0.5 ? 1.5 : 1),
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  )
}

// ─── Step indicator (progress bar) ───
function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 w-full max-w-[200px] mx-auto">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          className={cn(
            'h-1.5 rounded-full flex-1 transition-colors',
            i <= current ? 'bg-primary' : 'bg-secondary'
          )}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        />
      ))}
    </div>
  )
}

// ─── Slide wrapper with framer-motion ───
function StepSlide({
  children,
  direction,
  stepKey,
}: {
  children: React.ReactNode
  direction: 'left' | 'right'
  stepKey: number
}) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial={{ x: direction === 'right' ? 300 : -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: direction === 'right' ? -300 : 300, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Pre-set wallet options ───
const WALLET_PRESETS = [
  { name: 'Tunai', icon: '💵', color: '#4CAF50', type: 'cash' as const },
  { name: 'BCA', icon: '🔴', color: '#3B82F6', type: 'bank' as const },
  { name: 'GoPay', icon: '💜', color: '#8A6ECF', type: 'ewallet' as const },
]

const INCOME_PRESETS = [
  3_000_000, 5_000_000, 8_000_000, 10_000_000, 15_000_000, 20_000_000,
]

// ─── Main Onboarding Wizard ───
export function OnboardingWizard({ onComplete }: { onComplete: (data: {
  selectedCategories: string[]
  wallet: { name: string; icon: string; balance: number; color: string; type: 'bank' | 'ewallet' | 'cash' | 'credit' }
  monthlyIncome: number
}) => void }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const [selectedCats, setSelectedCats] = useState<string[]>(['food', 'transport', 'shopping'])
  const [walletName, setWalletName] = useState('Tunai')
  const [walletIcon, setWalletIcon] = useState('💵')
  const [walletColor, setWalletColor] = useState('#4CAF50')
  const [walletType, setWalletType] = useState<'bank' | 'ewallet' | 'cash' | 'credit'>('cash')
  const [walletBalance, setWalletBalance] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)

  const TOTAL_STEPS = 5 // 0=welcome, 1=categories, 2=wallet, 3=income, 4=celebration

  const goNext = useCallback(() => {
    if (step === 3) {
      // Save income
      const income = Number(monthlyIncome.replace(/\D/g, '')) || 0
      try { localStorage.setItem(INCOME_KEY, JSON.stringify(income)) } catch {}
    }
    if (step === 4) {
      // Final step — complete
      const wallet = {
        id: walletName.toLowerCase().replace(/\s+/g, '-') || 'cash',
        name: walletName,
        icon: walletIcon,
        balance: Number(walletBalance.replace(/\D/g, '')) || 0,
        color: walletColor,
        type: walletType as 'bank' | 'ewallet' | 'cash' | 'credit',
      }
      onComplete({
        selectedCategories: selectedCats,
        wallet,
        monthlyIncome: Number(monthlyIncome.replace(/\D/g, '')) || 0,
      })
      return
    }
    setDirection('right')
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
    if (step === 3) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
    }
  }, [step, selectedCats, walletName, walletIcon, walletColor, walletType, walletBalance, monthlyIncome, onComplete])

  const goBack = useCallback(() => {
    setDirection('left')
    setStep((s) => Math.max(s - 1, 0))
  }, [])

  const toggleCat = (id: string) => {
    setSelectedCats((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id)
      if (prev.length >= 7) return prev
      return [...prev, id]
    })
  }

  const selectPreset = (preset: typeof WALLET_PRESETS[number]) => {
    setWalletName(preset.name)
    setWalletIcon(preset.icon)
    setWalletColor(preset.color)
    setWalletType(preset.type)
  }

  // ─── Welcome Step ───
  function WelcomeStep() {
    return (
      <div className="flex flex-col items-center text-center gap-6 py-4">
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <FinWiseMascot size={128} state="celebrating" animate />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <h1 className="font-heading text-2xl font-bold">
            <span className="text-primary">Selamat Datang</span>
            <br />
            di FinWise! 🎉
          </h1>
          <p className="text-muted-foreground text-sm max-w-[260px] mx-auto leading-relaxed">
            Yuk kita atur keuanganmu dalam beberapa langkah mudah. Tidak butuh waktu lama, kok! ✨
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col gap-2 w-full max-w-[240px]"
        >
          {[
            { emoji: '📂', text: 'Pilih kategori favorit' },
            { emoji: '💰', text: 'Atur dompet pertama' },
            { emoji: '📊', text: 'Set target pengeluaran' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.15 }}
              className="flex items-center gap-3 text-sm text-left"
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="text-foreground/80">{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    )
  }

  // ─── Categories Step ───
  function CategoriesStep() {
    return (
      <div className="flex flex-col gap-5 py-2">
        <div className="text-center space-y-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-3xl mx-auto w-fit"
          >
            📂
          </motion.div>
          <h2 className="font-heading text-lg font-bold">Pilih Kategori Favoritmu</h2>
          <p className="text-xs text-muted-foreground">
            Pilih 3-5 kategori yang paling sering kamu pakai (bisa diubah nanti)
          </p>
          <p className="text-xs text-primary font-medium">
            {selectedCats.length} dipilih
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {EXPENSE_CATEGORIES.map((cat, i) => {
            const Icon = cat.icon
            const selected = selectedCats.includes(cat.id)
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleCat(cat.id)}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-2xl p-3 text-left transition-all',
                  'border-2',
                  selected
                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                    : 'border-transparent bg-secondary/80 hover:bg-secondary'
                )}
                style={selected ? {
                  boxShadow: `0 4px 16px ${cat.color}25, inset 0 1px 0 rgba(255,255,255,0.5)`,
                } : {}}
              >
                <div
                  className="flex size-9 items-center justify-center rounded-xl shrink-0"
                  style={{
                    backgroundColor: selected ? `${cat.color}30` : `${cat.color}15`,
                    color: cat.color,
                  }}
                >
                  <Icon className="size-4.5" />
                </div>
                <span className={cn(
                  'text-xs font-medium truncate',
                  selected ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {cat.label}
                </span>
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 size-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="size-3 text-white" />
                  </motion.div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Wallet Step ───
  function WalletStep() {
    return (
      <div className="flex flex-col gap-5 py-2">
        <div className="text-center space-y-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-3xl mx-auto w-fit"
          >
            💰
          </motion.div>
          <h2 className="font-heading text-lg font-bold">Atur Dompet Pertama</h2>
          <p className="text-xs text-muted-foreground">
            Pilih dompet yang sudah ada atau buat sendiri
          </p>
        </div>

        {/* Preset wallets */}
        <div className="grid grid-cols-3 gap-2">
          {WALLET_PRESETS.map((preset, i) => {
            const active = walletName === preset.name
            return (
              <motion.button
                key={preset.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => selectPreset(preset)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl p-4 transition-all border-2',
                  active
                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                    : 'border-transparent bg-secondary/80 hover:bg-secondary'
                )}
              >
                <span className="text-2xl">{preset.icon}</span>
                <span className={cn(
                  'text-xs font-semibold',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {preset.name}
                </span>
              </motion.button>
            )
          })}
        </div>

        {/* Custom wallet name */}
        <div className="space-y-3 p-4 rounded-2xl bg-secondary/50 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground">Atau custom:</p>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Nama Dompet</Label>
              <Input
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Contoh: BCA, GoPay, Cash"
                className="h-10 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Saldo Awal (Rp) — opsional</Label>
              <Input
                inputMode="numeric"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="h-10 rounded-xl mt-1 tabular-nums"
              />
            </div>
          </div>

          {/* Quick balance presets */}
          <div className="flex flex-wrap gap-1.5">
            {[100_000, 500_000, 1_000_000, 5_000_000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setWalletBalance(String(v))}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-medium transition',
                  walletBalance === String(v)
                    ? 'bg-primary text-white'
                    : 'bg-white text-muted-foreground hover:bg-primary/10'
                )}
                style={{ boxShadow: '0 2px 8px rgba(138,110,207,0.1)' }}
              >
                {v >= 1_000_000 ? `${v / 1_000_000}jt` : `${v / 1_000}rb`}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Income Step ───
  function IncomeStep() {
    return (
      <div className="flex flex-col gap-5 py-2">
        <div className="text-center space-y-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-3xl mx-auto w-fit"
          >
            📊
          </motion.div>
          <h2 className="font-heading text-lg font-bold">Penghasilan Bulanan</h2>
          <p className="text-xs text-muted-foreground">
            Opsional — bantu FinWise hitung budget otomatis
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Jumlah Penghasilan (Rp)</Label>
            <Input
              inputMode="numeric"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="h-12 text-lg tabular-nums rounded-xl mt-1"
              autoFocus={false}
            />
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-3 gap-2">
            {INCOME_PRESETS.map((v, i) => (
              <motion.button
                key={v}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMonthlyIncome(String(v))}
                className={cn(
                  'rounded-2xl p-3 text-xs font-semibold transition-all border-2',
                  monthlyIncome === String(v)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent bg-secondary/80 text-muted-foreground hover:bg-secondary'
                )}
              >
                {v >= 1_000_000 ? `Rp${v / 1_000_000}jt` : `Rp${v / 1_000}rb`}
              </motion.button>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10"
        >
          <span className="text-lg">💡</span>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Kamu bisa skip langkah ini dan mengaturnya nanti di Pengaturan
          </p>
        </motion.div>
      </div>
    )
  }

  // ─── Celebration Step ───
  function CelebrationStep() {
    return (
      <div className="flex flex-col items-center text-center gap-6 py-6">
        {showConfetti && <Confetti />}

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.3 }}
        >
          <div className="relative">
            <FinWiseMascot size={128} state="celebrating" animate />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="absolute -top-3 -right-3 text-4xl"
            >
              🎉
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-2"
        >
          <h1 className="font-heading text-2xl font-bold text-primary">
            Siap Mulai! 🚀
          </h1>
          <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
            Semua sudah siap. Yuk mulai catat transaksi pertamamu!
          </p>
        </motion.div>

        {/* Summary cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="w-full max-w-[280px] space-y-2"
        >
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
            <span className="text-lg">📂</span>
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground">Kategori</p>
              <p className="text-xs font-semibold">{selectedCats.length} dipilih</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
            <span className="text-lg">{walletIcon}</span>
            <div className="text-left">
              <p className="text-[10px] text-muted-foreground">Dompet</p>
              <p className="text-xs font-semibold">{walletName}</p>
            </div>
          </div>
          {Number(monthlyIncome.replace(/\D/g, '')) > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
              <span className="text-lg">💰</span>
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground">Penghasilan</p>
                <p className="text-xs font-semibold">
                  Rp{Number(monthlyIncome.replace(/\D/g, '')).toLocaleString('id-ID')}/bulan
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  const steps = [
    <WelcomeStep key="welcome" />,
    <CategoriesStep key="categories" />,
    <WalletStep key="wallet" />,
    <IncomeStep key="income" />,
    <CelebrationStep key="celebration" />,
  ]

  const buttonLabels = [
    'Mulai Yuk!',
    'Lanjut',
    'Lanjut',
    monthlyIncome ? 'Selesai' : 'Skip',
    'Masuk ke FinWise 🚀',
  ]

  const canProceed = [
    true, // welcome
    selectedCats.length >= 3, // categories (min 3)
    walletName.trim().length > 0, // wallet
    true, // income (optional)
    true, // celebration
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex flex-col bg-background"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        {step > 0 && step < 4 ? (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ChevronLeft className="size-4" />
            Kembali
          </motion.button>
        ) : (
          <div className="w-16" />
        )}

        <StepProgress current={step} total={TOTAL_STEPS} />

        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6">
        <StepSlide direction={direction} stepKey={step}>
          {steps[step]}
        </StepSlide>
      </div>

      {/* Bottom button */}
      <div className="px-6 pb-8 pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={goNext}
          disabled={!canProceed[step]}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all',
            canProceed[step]
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : 'bg-secondary text-muted-foreground cursor-not-allowed'
          )}
          style={canProceed[step] ? {
            boxShadow: '0 8px 24px rgba(138,110,207,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
          } : {}}
        >
          {buttonLabels[step]}
          {step < 4 && <ChevronRight className="size-4" />}
        </motion.button>

        {step === 3 && (
          <button
            onClick={() => {
              setMonthlyIncome('')
              goNext()
            }}
            className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition py-1"
          >
            Lewati langkah ini
          </button>
        )}
      </div>
    </motion.div>
  )
}

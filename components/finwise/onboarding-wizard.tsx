'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Check, Plus, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXPENSE_CATEGORIES } from '@/lib/finwise'
import { detectLogo } from '@/lib/brand-logos'
import { FinWiseMascot } from '@/components/finwise/mascot'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Storage keys ───
const SETUP_KEY = 'fw.setupDone.v1'
const SELECTED_CATS_KEY = 'fw.onboarding.cats'
const INCOME_KEY = 'fw.onboarding.income'

// Format number with Indonesian dots: 15000 → "15.000"
function formatIDR(val: string): string {
  if (!val) return ''
  const clean = val.replace(/\D/g, '')
  if (!clean) return ''
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// ─── Types ───
interface WalletData {
  id: string
  name: string
  icon: string
  balance: string
  color: string
  type: 'bank' | 'ewallet' | 'cash' | 'credit'
  logo?: string
}

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
const WALLET_PRESETS: (Omit<WalletData, 'id' | 'balance'> & { logo?: string })[] = [
  { name: 'BCA', icon: '🏦', color: '#003d79', type: 'bank', logo: '/logos/bank/BCA.svg' },
  { name: 'Mandiri', icon: '🏦', color: '#003366', type: 'bank', logo: '/logos/bank/Mandiri.svg' },
  { name: 'BRI', icon: '🏦', color: '#003d79', type: 'bank', logo: '/logos/bank/BRI.svg' },
  { name: 'BNI', icon: '🏦', color: '#f57c00', type: 'bank', logo: '/logos/bank/BNI.svg' },
  { name: 'BSI', icon: '🏦', color: '#1a5632', type: 'bank', logo: '/logos/bank/BSI.svg' },
  { name: 'SeaBank', icon: '🏦', color: '#e74c3c', type: 'bank', logo: '/logos/bank/SeaBank.svg' },
  { name: 'GoPay', icon: '📱', color: '#00aa13', type: 'ewallet', logo: '/logos/ewallet/Gopay.svg' },
  { name: 'OVO', icon: '📱', color: '#4c3085', type: 'ewallet', logo: '/logos/ewallet/OVO.svg' },
  { name: 'DANA', icon: '📱', color: '#108ee9', type: 'ewallet', logo: '/logos/ewallet/DANA.svg' },
  { name: 'ShopeePay', icon: '📱', color: '#ee4d2d', type: 'ewallet', logo: '/logos/ewallet/Shopee_Pay.svg' },
  { name: 'LinkAja', icon: '📱', color: '#e74c3c', type: 'ewallet', logo: '/logos/ewallet/LinkAja.svg' },
  { name: 'Tunai', icon: '💵', color: '#4CAF50', type: 'cash' },
]

// ─── Wallet Step Content (extracted outside parent) ───
function WalletStepContent({
  wallets, setWallets,
}: {
  wallets: WalletData[]
  setWallets: (w: WalletData[]) => void
}) {
  const [activeIdx, setActiveIdx] = useState(0)
  // Local state for the active wallet input (avoids parent re-render)
  const [localName, setLocalName] = useState(wallets[0]?.name || '')
  const [localBalance, setLocalBalance] = useState(wallets[0]?.balance || '')

  // Sync local state when active wallet changes
  useEffect(() => {
    setLocalName(wallets[activeIdx]?.name || '')
    setLocalBalance(wallets[activeIdx]?.balance || '')
  }, [activeIdx, wallets])

  // Sync local changes back to wallets array (on blur)
  const syncToWallets = useCallback(() => {
    const updated = [...wallets]
    if (updated[activeIdx]) {
      const detectedLogo = detectLogo(localName)
      updated[activeIdx] = {
        ...updated[activeIdx],
        name: localName,
        balance: localBalance,
        logo: detectedLogo || updated[activeIdx].logo,
      }
      setWallets(updated)
    }
  }, [wallets, activeIdx, localName, localBalance, setWallets])

  // Add new wallet
  const addWallet = () => {
    syncToWallets()
    const newWallet: WalletData = {
      id: `wallet-${Date.now()}`,
      name: '',
      icon: '💳',
      balance: '',
      color: '#8A6ECF',
      type: 'bank',
    }
    const updated = [...wallets, newWallet]
    setWallets(updated)
    setActiveIdx(updated.length - 1)
  }

  // Remove wallet
  const removeWallet = (idx: number) => {
    if (wallets.length <= 1) return
    const updated = wallets.filter((_, i) => i !== idx)
    setWallets(updated)
    if (activeIdx >= updated.length) setActiveIdx(updated.length - 1)
    else if (activeIdx === idx) setActiveIdx(0)
  }

  // Select preset for active wallet
  const selectPreset = (preset: Omit<WalletData, 'id' | 'balance'> & { logo?: string }) => {
    const updated = [...wallets]
    if (updated[activeIdx]) {
      updated[activeIdx] = {
        ...updated[activeIdx],
        name: preset.name,
        icon: preset.icon,
        color: preset.color,
        type: preset.type,
        logo: preset.logo,
      }
      setWallets(updated)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="text-center space-y-1">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-3xl mx-auto w-fit"
        >
          💰
        </motion.div>
        <h2 className="font-heading text-lg font-bold">Atur Dompetmu</h2>
        <p className="text-xs text-muted-foreground">
          Tambahkan dompet yang kamu punya (bisa diubah nanti)
        </p>
      </div>

      {/* Wallet tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {wallets.map((w, i) => {
          const preset = WALLET_PRESETS.find(p => p.name === w.name)
          const logoSrc = preset?.logo || w.logo || detectLogo(w.name)
          return (
          <motion.button
            key={w.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { syncToWallets(); setActiveIdx(i) }}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 border-2',
              i === activeIdx
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-transparent bg-secondary/80 text-muted-foreground'
            )}
          >
            {logoSrc ? (
              <img src={logoSrc} alt="" className="w-4 h-4 object-contain rounded-sm" />
            ) : (
              <span>{w.icon || '💳'}</span>
            )}
            <span>{w.name || 'Baru'}</span>
            {wallets.length > 1 && i === activeIdx && (
              <button
                onClick={(e) => { e.stopPropagation(); removeWallet(i) }}
                className="ml-1 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </motion.button>
          )
        })}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={addWallet}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-primary bg-primary/5 border-2 border-dashed border-primary/30 hover:bg-primary/10 transition shrink-0"
        >
          <Plus className="size-3.5" />
          Tambah
        </motion.button>
      </div>

      {/* Preset wallets */}
      <div className="grid grid-cols-3 gap-2">
        {WALLET_PRESETS.map((preset, i) => {
          const active = wallets[activeIdx]?.name === preset.name
          return (
            <motion.button
              key={preset.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => selectPreset(preset)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all border-2',
                active
                  ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                  : 'border-transparent bg-secondary/80 hover:bg-secondary'
              )}
            >
              {preset.logo ? (
                <div className="size-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                  <img src={preset.logo} alt={preset.name} className="w-8 h-8 object-contain" />
                </div>
              ) : (
                <span className="text-xl">{preset.icon}</span>
              )}
              <span className={cn(
                'text-[10px] font-semibold',
                active ? 'text-primary' : 'text-muted-foreground'
              )}>
                {preset.name}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Custom wallet fields */}
      <div className="space-y-2 p-3 rounded-2xl bg-secondary/50 border border-border/50">
        <p className="text-xs font-medium text-muted-foreground">Detail dompet:</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Nama Dompet</Label>
            <Input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={syncToWallets}
              placeholder="BCA"
              className="h-9 rounded-xl mt-0.5 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px]">Saldo Awal (Rp)</Label>
            <Input
              inputMode="numeric"
              value={formatIDR(localBalance)}
              onChange={(e) => setLocalBalance(e.target.value.replace(/\D/g, ''))}
              onBlur={syncToWallets}
              placeholder="0"
              className="h-9 rounded-xl mt-0.5 text-xs tabular-nums"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[100_000, 500_000, 1_000_000, 5_000_000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setLocalBalance(String(v))
                const updated = [...wallets]
                if (updated[activeIdx]) {
                  updated[activeIdx] = { ...updated[activeIdx], balance: String(v) }
                  setWallets(updated)
                }
              }}
              className={cn(
                'rounded-full px-2 py-0.5 text-[9px] font-medium transition',
                localBalance === String(v)
                  ? 'bg-primary text-white'
                  : 'bg-white text-muted-foreground hover:bg-primary/10'
              )}
            >
              {v >= 1_000_000 ? `${v / 1_000_000}jt` : `${v / 1_000}rb`}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Salary Step Content (extracted outside parent) ───
function SalaryStepContent({
  salaryAmount, setSalaryAmount,
  salaryDay, setSalaryDay,
}: {
  salaryAmount: string
  setSalaryAmount: (v: string) => void
  salaryDay: number
  setSalaryDay: (d: number) => void
}) {
  const [localAmount, setLocalAmount] = useState(salaryAmount)

  useEffect(() => {
    setLocalAmount(salaryAmount)
  }, [salaryAmount])

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="text-center space-y-1">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-3xl mx-auto w-fit"
        >
          💸
        </motion.div>
        <h2 className="font-heading text-lg font-bold">Gaji Otomatis</h2>
        <p className="text-xs text-muted-foreground">
          Atur gaji bulanan supaya saldo otomatis bertambah setiap bulan
        </p>
      </div>

      {/* Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10"
      >
        <span className="text-base mt-0.5">💡</span>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Gaji kamu akan otomatis masuk ke dompet setiap bulan di tanggal yang dipilih.
          Tercatat sebagai pemasukan otomatis. Kamu bisa skip dan atur nanti di Pengaturan.
        </p>
      </motion.div>

      {/* Salary amount */}
      <div className="space-y-2">
        <Label className="text-xs">Nominal Gaji (Rp)</Label>
        <Input
          inputMode="numeric"
          value={formatIDR(localAmount)}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            setLocalAmount(v)
            setSalaryAmount(v)
          }}
          placeholder="5.000.000"
          className="h-12 text-lg tabular-nums rounded-xl mt-1"
        />
      </div>

      {/* Day picker */}
      <div className="space-y-2">
        <Label className="text-xs">Tanggal Masuk Setiap Bulan</Label>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <motion.button
              key={day}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSalaryDay(day)}
              className={cn(
                'h-9 rounded-lg text-xs font-medium transition-all',
                salaryDay === day
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-secondary/80 text-muted-foreground hover:bg-secondary'
              )}
            >
              {day}
            </motion.button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Dipilih: tanggal <span className="font-semibold text-primary">{salaryDay}</span> setiap bulan
        </p>
      </div>
    </div>
  )
}

// ─── Main Onboarding Wizard ───
export function OnboardingWizard({ onComplete }: { onComplete: (data: {
  selectedCategories: string[]
  wallets: WalletData[]
  salaryAmount: number
  salaryDay: number
}) => void }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const [selectedCats, setSelectedCats] = useState<string[]>(['food', 'transport', 'shopping'])
  const [showConfetti, setShowConfetti] = useState(false)

  // Multi-wallet state
  const [wallets, setWallets] = useState<WalletData[]>([{
    id: 'wallet-1',
    name: 'Tunai',
    icon: '💵',
    balance: '',
    color: '#4CAF50',
    type: 'cash',
  }])

  // Salary state
  const [salaryAmount, setSalaryAmount] = useState('')
  const [salaryDay, setSalaryDay] = useState(1)

  const TOTAL_STEPS = 5 // 0=welcome, 1=categories, 2=wallet, 3=salary, 4=celebration

  const goNext = useCallback(() => {
    if (step === 4) {
      // Final step — complete
      onComplete({
        selectedCategories: selectedCats,
        wallets: wallets.filter(w => w.name.trim().length > 0),
        salaryAmount: Number(salaryAmount.replace(/\D/g, '')) || 0,
        salaryDay,
      })
      return
    }
    setDirection('right')
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
    if (step === 3) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
    }
  }, [step, selectedCats, wallets, salaryAmount, salaryDay, onComplete])

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
            { emoji: '💰', text: 'Atur dompet & saldo' },
            { emoji: '💸', text: 'Set gaji otomatis' },
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
          {wallets.filter(w => w.name.trim()).map((w) => {
            const preset = WALLET_PRESETS.find(p => p.name === w.name)
            const logoSrc = preset?.logo || w.logo || detectLogo(w.name)
            return (
              <div key={w.id} className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                {logoSrc ? (
                  <img src={logoSrc} alt="" className="w-7 h-7 object-contain rounded-md" />
                ) : (
                  <span className="text-lg">{w.icon}</span>
                )}
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground">Dompet</p>
                  <p className="text-xs font-semibold">
                    {w.name}
                    {w.balance && ` — Rp${Number(w.balance).toLocaleString('id-ID')}`}
                  </p>
                </div>
              </div>
            )
          })}
          {Number(salaryAmount.replace(/\D/g, '')) > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
              <span className="text-lg">💸</span>
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground">Gaji Otomatis</p>
                <p className="text-xs font-semibold">
                  Rp{Number(salaryAmount.replace(/\D/g, '')).toLocaleString('id-ID')} — tgl {salaryDay}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  // ─── Steps array ───
  const steps = [
    <WelcomeStep key="welcome" />,
    <CategoriesStep key="categories" />,
    <WalletStepContent key="wallet" wallets={wallets} setWallets={setWallets} />,
    <SalaryStepContent key="salary" salaryAmount={salaryAmount} setSalaryAmount={setSalaryAmount} salaryDay={salaryDay} setSalaryDay={setSalaryDay} />,
    <CelebrationStep key="celebration" />,
  ]

  const buttonLabels = [
    'Mulai Yuk!',
    'Lanjut',
    'Lanjut',
    salaryAmount ? 'Lanjut' : 'Skip',
    'Masuk ke FinWise 🚀',
  ]

  const hasValidWallet = wallets.some(w => w.name.trim().length > 0)

  const canProceed = [
    true, // welcome
    selectedCats.length >= 3, // categories (min 3)
    hasValidWallet, // wallet
    true, // salary (optional)
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
              setSalaryAmount('')
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

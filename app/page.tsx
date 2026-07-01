'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  BarChart3, Camera, Home, ListChecks, Plus, Sparkles, Wallet,
  Settings, ChevronLeft, ChevronRight, Target, Repeat, Download,
  FileText, Lock, Lightbulb, Bell, TrendingUp, ArrowDownRight,
  ArrowUpRight, Search, Filter, X, Check, Trash2, ToggleLeft,
  ToggleRight, CalendarClock, Shield, Eye, EyeOff, Moon, Sun,
  PiggyBank, ReceiptText, ShieldCheck, Upload, LogOut,
  ArrowDownUp, ArrowLeftRight, Pencil,
  Users, CreditCard, Mic, Heart, User,
} from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { FinwiseProvider, useFinwise } from '@/components/finwise-store'
import { DashboardView } from '@/components/finwise/dashboard-view'
import { TransactionsView } from '@/components/finwise/transactions-view'
import { TrendsView } from '@/components/finwise/trends-view'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { AddTransactionForm } from '@/components/finwise/add-transaction-form'
import { ScanFlow } from '@/components/finwise/scan-flow'
import { AdvisorChat } from '@/components/finwise/advisor-chat'
import { SplashScreen } from '@/components/splash-screen'
import { LoadingScreen, AchievementsList } from '@/components/finwise/mascot'
import { SmartNotifications, NotificationBell, NotificationCenter, RequestNotificationButton } from '@/components/finwise/smart-notifications'
import { useGamification, BadgeGrid, BadgeUnlockToast } from '@/components/finwise/gamification'
import { SmartBudgetSheet } from '@/components/finwise/smart-budget'
import { SplitBillSheet } from '@/components/finwise/split-bill'
import { haptic } from '@/lib/haptics'
import FinWiseLogo from '@/components/finwise-logo'
import { ThemePicker } from '@/components/finwise/theme-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BudgetProgress } from '@/components/finwise/budget-progress'
import { SpendingDonut } from '@/components/finwise/spending-donut'
import {
  formatIDR, formatIDRShort, summarize, spendingByCategory,
  filterByMonth, getMonthKey, getMonthLabel,
  EXPENSE_CATEGORIES, BENCHMARK, COLOR_PRESETS, ICON_OPTIONS,
  autoCategory, generateId, resolveCategory,
  formatIDRInput, parseIDRInput,
  type CategoryId, type Transaction, type Category, type TxType,
  type Wallet as WalletType, type Goal, type RecurringItem,
  WALLET_ICON_OPTIONS, WALLET_COLOR_PRESETS,
} from '@/lib/finwise'
import { cn } from '@/lib/utils'

type Tab = 'home' | 'transactions' | 'trends' | 'budget'
type Sheet = 'add' | 'scan' | 'advisor' | 'settings' | 'goals' | 'wallets' | 'transfer' | 'recurring' | 'export' | 'categories' | 'pin' | 'benchmark' | 'smart-budget' | 'split-bill' | 'notifications' | 'voice' | null

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

// ─── Export Sheet (lazy-loaded — only opened on demand) ───
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/error-boundary'
const ExportSheetNew = dynamic(() => import('@/components/finwise/export-sheet').then(m => m.ExportSheet), { ssr: false })
const OnboardingWizard = dynamic(() => import('@/components/finwise/onboarding-wizard').then(m => m.OnboardingWizard), { ssr: false, loading: () => <div className="min-h-screen bg-background" /> })
const VoiceInput = dynamic(() => import('@/components/voice-input'), { ssr: false })
import { detectLogo } from '@/lib/brand-logos'

// ─── Backup/Restore Sheet ───
function BackupSheet({ onClose }: { onClose: () => void }) {
  const { transactions, goals, wallets, recurring, budgets, monthlyIncome } = useFinwise()

  function exportFull() {
    const data = { transactions, goals, wallets, recurring, budgets, monthlyIncome, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `finwise-full-backup.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          alert('File backup tidak valid: struktur data tidak sesuai')
          return
        }
        const validKeys = ['transactions', 'budgets', 'monthlyIncome', 'goals', 'wallets', 'recurring'] as const
        const hasAtLeastOneKey = validKeys.some((k) => k in data)
        if (!hasAtLeastOneKey) {
          alert('File backup tidak valid: tidak ada data FinWise yang ditemukan')
          return
        }
        if ('transactions' in data && !Array.isArray(data.transactions)) {
          alert('File backup tidak valid: transactions harus berupa array')
          return
        }
        if ('goals' in data && !Array.isArray(data.goals)) {
          alert('File backup tidak valid: goals harus berupa array')
          return
        }
        if ('wallets' in data && !Array.isArray(data.wallets)) {
          alert('File backup tidak valid: wallets harus berupa array')
          return
        }
        if ('recurring' in data && !Array.isArray(data.recurring)) {
          alert('File backup tidak valid: recurring harus berupa array')
          return
        }
        if (data.transactions) localStorage.setItem('fw.tx.v2', JSON.stringify(data.transactions))
        if (data.budgets) localStorage.setItem('fw.budgets.v1', JSON.stringify(data.budgets))
        if (data.monthlyIncome) localStorage.setItem('fw.income.v1', JSON.stringify(data.monthlyIncome))
        if (data.goals) localStorage.setItem('fw.goals.v1', JSON.stringify(data.goals))
        if (data.wallets) localStorage.setItem('fw.wallets.v1', JSON.stringify(data.wallets))
        if (data.recurring) localStorage.setItem('fw.recurring.v1', JSON.stringify(data.recurring))
        window.location.reload()
      } catch { alert('File backup tidak valid') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={exportFull} className="gap-2"><Download className="size-4" /> Export Full Backup</Button>
      <div>
        <Label className="mb-2 block">Import Backup</Label>
        <Input type="file" accept=".json" onChange={importData} />
      </div>
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

// ─── Goals Sheet ───
function GoalsSheet({ onClose }: { onClose: () => void }) {
  const { goals, addGoal, deleteGoal, addToGoal } = useFinwise()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || parseIDRInput(target) <= 0) return
    addGoal({ id: generateId(), name, targetAmount: parseIDRInput(target), currentAmount: 0, deadline: deadline || '2026-12-31', icon: '🎯', color: COLOR_PRESETS[goals.length % COLOR_PRESETS.length] })
    setName(''); setTarget(''); setDeadline(''); setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-4 ">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 self-end"><Plus className="size-4" /> Baru</Button>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Input placeholder="Nama target (e.g. Laptop baru)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input inputMode="numeric" placeholder="Target nominal (Rp)" value={formatIDRInput(target)} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} />
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button><Button type="submit" className="flex-1">Simpan</Button></div>
        </form>
      )}
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Belum ada target tabungan 🎯</p>
      ) : goals.map((g) => {
        const pct = g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0
        return (
          <Card key={g.id}>
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{g.icon} {g.name}</span>
                <button onClick={() => { if (window.confirm(`Hapus target "${g.name}"?`)) deleteGoal(g.id) }} aria-label={`Hapus target ${g.name}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatIDR(g.currentAmount)} / {formatIDR(g.targetAmount)}</span>
                <span>{pct}%</span>
              </div>
              <div className="flex gap-2 mt-1">
                <Input inputMode="numeric" placeholder="Tambah (Rp)" className="h-7 text-xs" id={`goal-${g.id}`} />
                <Button size="sm" className="h-7 text-xs" onClick={() => {
                  const el = document.getElementById(`goal-${g.id}`) as HTMLInputElement
                  const v = Number(el?.value?.replace(/\D/g, '')) || 0
                  if (v > 0) { addToGoal(g.id, v); if (el) el.value = '' }
                }}>+Tambah</Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

// ─── Wallets Sheet ───
function WalletsSheet({ onClose }: { onClose: () => void }) {
  const { wallets, addWallet, updateWallet, deleteWallet, getWalletBalance, getTotalBalance, transactions, allCategories } = useFinwise()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💵')
  const [initBalance, setInitBalance] = useState('')
  const [walletColor, setWalletColor] = useState(WALLET_COLOR_PRESETS[0])
  const [walletType, setWalletType] = useState<'bank' | 'ewallet' | 'cash' | 'credit'>('cash')
  const [editingId, setEditingId] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    const balance = parseIDRInput(initBalance)
    const detectedLogo = detectLogo(name)
    if (editingId) {
      updateWallet(editingId, { name, icon, balance, color: walletColor, type: walletType, logo: detectedLogo })
      setEditingId(null)
    } else {
      addWallet({ id: generateId(), name, icon, balance, color: walletColor, type: walletType, logo: detectedLogo })
    }
    setName(''); setInitBalance(''); setIcon('💵'); setWalletColor(WALLET_COLOR_PRESETS[0]); setWalletType('cash'); setShowForm(false)
  }

  function startEdit(w: WalletType) {
    setName(w.name)
    setIcon(w.icon)
    setInitBalance(String(w.balance))
    setWalletColor(w.color)
    setWalletType(w.type || 'cash')
    setEditingId(w.id)
    setShowForm(true)
  }

  return (
    <div className="flex flex-col gap-4 ">
      {/* Total saldo */}
      <div className="rounded-xl bg-primary/10 p-3 text-center">
        <p className="text-xs text-muted-foreground">Total Saldo</p>
        <p className="text-xl font-bold text-primary">{formatIDR(getTotalBalance())}</p>
      </div>
      <div className="flex gap-2 self-end">
        <Button size="sm" variant="outline" onClick={() => { onClose(); setTimeout(() => { const ev = new CustomEvent('open-sheet', { detail: 'transfer' }); window.dispatchEvent(ev) }, 100) }} className="gap-1"><ArrowLeftRight className="size-4" /> Transfer</Button>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditingId(null); setName(''); setIcon('💵'); setInitBalance(''); }} className="gap-1"><Plus className="size-4" /> Baru</Button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Input placeholder="Nama dompet (e.g. GoPay)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input inputMode="numeric" placeholder="Saldo awal (Rp)" value={formatIDRInput(initBalance)} onChange={(e) => setInitBalance(e.target.value.replace(/\D/g, ''))} />

          {/* Wallet Type */}
          <div>
            <Label className="text-xs mb-1 block">Tipe Dompet</Label>
            <div className="grid grid-cols-4 gap-1">
              {(['cash', 'bank', 'ewallet', 'credit'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setWalletType(t)} className={cn('text-[10px] py-1.5 px-2 rounded-lg font-medium transition', walletType === t ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')}>
                  {t === 'cash' ? '💵 Cash' : t === 'bank' ? '🏦 Bank' : t === 'ewallet' ? '📱 E-Wallet' : '💳 Kredit'}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <Label className="text-xs mb-1 block">Ikon</Label>
            <div className="flex flex-wrap gap-1.5">
              {WALLET_ICON_OPTIONS.map((opt) => (
                <button key={opt.emoji} type="button" onClick={() => setIcon(opt.emoji)} className={cn('text-xl p-1.5 rounded-lg transition', icon === opt.emoji ? 'bg-primary/20 ring-2 ring-primary/40' : 'bg-secondary hover:bg-secondary/80')}>{opt.emoji}</button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <Label className="text-xs mb-1 block">Warna</Label>
            <div className="flex flex-wrap gap-1.5">
              {WALLET_COLOR_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => setWalletColor(c)} className={cn('size-7 rounded-full transition', walletColor === c ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110')} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowForm(false); setEditingId(null) }}>Batal</Button><Button type="submit" className="flex-1">{editingId ? 'Update' : 'Simpan'}</Button></div>
        </form>
      )}
      {wallets.map((w) => {
        const computed = getWalletBalance(w.id)
        const walletTx = transactions.filter(t => t.walletId === w.id)
        const txCount = walletTx.length
        return (
        <Card key={w.id} className="overflow-visible shadow-sm border-l-4" style={{ borderLeftColor: w.color }}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              {/* Sisi Kiri: Logo + Detail */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center justify-center size-10 rounded-xl text-lg shrink-0" style={{ backgroundColor: `${w.color}20`, color: w.color }}>
                  {w.logo || detectLogo(w.name) ? (
                    <img src={w.logo || detectLogo(w.name)} alt="" className="w-7 h-7 object-contain dark:rounded-md dark:bg-white/20 dark:p-0.5" />
                  ) : (
                    w.icon
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{w.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{txCount} transaksi · {w.type || 'cash'}</p>
                </div>
              </div>
              
              {/* Sisi Kanan: Saldo + Aksi */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right mr-1">
                  <p className="text-sm font-bold text-primary tabular-nums">{formatIDR(computed)}</p>
                </div>
                <div className="flex items-center gap-1 border-l pl-2 border-border">
                  <button onClick={() => startEdit(w)} aria-label={`Edit ${w.name}`} className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-muted transition-colors"><Settings className="size-4" /></button>
                  <button onClick={() => { if (window.confirm(`Hapus dompet "${w.name}"? Saldo akan hilang.`)) deleteWallet(w.id) }} aria-label={`Hapus dompet ${w.name}`} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-muted transition-colors"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )
      })}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

// ─── Transfer Sheet ───
function TransferSheet({ onClose }: { onClose: () => void }) {
  const { wallets, addTransaction, getWalletBalance } = useFinwise()
  const [fromId, setFromId] = useState(wallets[0]?.id || '')
  const [toId, setToId] = useState(wallets[1]?.id || '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const valid = parseIDRInput(amount) > 0 && fromId && toId && fromId !== toId

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const val = parseIDRInput(amount)
    const fromName = wallets.find(w => w.id === fromId)?.name || 'Dompet'
    const toName = wallets.find(w => w.id === toId)?.name || 'Dompet'
    // Create expense from source wallet
    addTransaction({
      type: 'expense',
      category: 'transfer',
      amount: val,
      description: note || `Transfer ke ${toName}`,
      date: new Date().toISOString().slice(0, 10),
      walletId: fromId,
    })
    // Create income to destination wallet
    addTransaction({
      type: 'income',
      category: 'transfer',
      amount: val,
      description: note || `Transfer dari ${fromName}`,
      date: new Date().toISOString().slice(0, 10),
      walletId: toId,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Dari Dompet</Label>
        <div className="grid grid-cols-3 gap-2">
          {wallets.map((w) => {
            const bal = getWalletBalance(w.id)
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setFromId(w.id)}
                disabled={w.id === toId}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition',
                  w.id === toId ? 'opacity-40 cursor-not-allowed' : '',
                  fromId === w.id
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-secondary',
                )}
              >
                <span className="text-lg">{w.logo || detectLogo(w.name) ? <img src={w.logo || detectLogo(w.name)} alt="" className="w-6 h-6 object-contain dark:rounded-md dark:bg-white/20 dark:p-0.5" /> : w.icon}</span>
                <span className="truncate">{w.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatIDR(bal)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="rounded-full bg-primary/20 p-2">
          <ArrowDownUp className="size-5 text-primary" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Ke Dompet</Label>
        <div className="grid grid-cols-3 gap-2">
          {wallets.map((w) => {
            const bal = getWalletBalance(w.id)
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setToId(w.id)}
                disabled={w.id === fromId}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition',
                  w.id === fromId ? 'opacity-40 cursor-not-allowed' : '',
                  toId === w.id
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-secondary',
                )}
              >
                <span className="text-lg">{w.logo || detectLogo(w.name) ? <img src={w.logo || detectLogo(w.name)} alt="" className="w-6 h-6 object-contain dark:rounded-md dark:bg-white/20 dark:p-0.5" /> : w.icon}</span>
                <span className="truncate">{w.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatIDR(bal)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Jumlah (Rp)</Label>
        <Input
          inputMode="numeric"
          autoFocus
          placeholder="0"
          value={formatIDRInput(amount)}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          className="h-12 text-lg tabular-nums"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Catatan (opsional)</Label>
        <Input placeholder="Contoh: Top up GoPay" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <Button type="submit" disabled={!valid} className="h-12">
        <ArrowLeftRight className="size-5 mr-2" /> Transfer
      </Button>
    </form>
  )
}

// ─── Custom Categories Sheet ───
function CategoriesSheet({ onClose }: { onClose: () => void }) {
  const { allCategories, addCustomCategory, deleteCustomCategory } = useFinwise()
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<TxType>('expense')
  const [color, setColor] = useState(COLOR_PRESETS[0])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label) return
    const id = label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    addCustomCategory({ id, label, icon: ReceiptText, color, type })
    setLabel(''); setShowForm(false)
  }

  const customCats = Object.values(allCategories).filter((c) => c.isCustom)

  return (
    <div className="flex flex-col gap-4 ">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 self-end"><Plus className="size-4" /> Kategori Baru</Button>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Input placeholder="Nama kategori" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="expense">Pengeluaran</TabsTrigger><TabsTrigger value="income">Pemasukan</TabsTrigger></TabsList>
          </Tabs>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PRESETS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Pilih warna ${c}`} className={cn('size-6 rounded-full', color === c && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button><Button type="submit" className="flex-1">Simpan</Button></div>
        </form>
      )}
      {customCats.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Belum ada kategori custom</p>
      ) : customCats.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg">
            <div className="size-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${c.color} 22%, transparent)` }}><Icon className="size-4" style={{ color: c.color }} /></div>
            <span className="flex-1 text-sm">{c.label}</span>
            <span className="text-xs text-muted-foreground">{c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
            <button onClick={() => { if (window.confirm(`Hapus kategori "${c.label}"?`)) deleteCustomCategory(c.id) }} aria-label={`Hapus kategori ${c.label}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
          </div>
        )
      })}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

// ─── PIN Settings Sheet ───
function PinSheet({ onClose }: { onClose: () => void }) {
  const { pin, setPin } = useFinwise()
  const [newPin, setNewPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  async function handleSave() {
    if (newPin.length < 4) { setError('PIN minimal 4 digit'); return }
    if (newPin !== confirm) { setError('PIN tidak cocok'); return }
    await setPin(newPin); onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      {pin && (
        <div className="p-3 rounded-xl bg-secondary text-sm">
          <p>PIN aktif: ••••</p>
          <Button size="sm" variant="destructive" className="mt-2" onClick={() => { setPin(null); onClose() }}>Nonaktifkan PIN</Button>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label>{pin ? 'Ubah PIN' : 'Buat PIN Baru'}</Label>
        <Input type="password" inputMode="numeric" maxLength={6} placeholder="PIN baru" value={newPin} onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, '')); setError('') }} />
        <Input type="password" inputMode="numeric" maxLength={6} placeholder="Konfirmasi PIN" value={confirm} onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, '')); setError('') }} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={onClose}>Batal</Button><Button className="flex-1" onClick={handleSave}>Simpan</Button></div>
    </div>
  )
}

// ─── Benchmark Sheet ───
function BenchmarkSheet({ onClose }: { onClose: () => void }) {
  const { transactions, allCategories, monthlyIncome } = useFinwise()
  const { expense } = summarize(transactions)
  const byCat = spendingByCategory(transactions, allCategories)

  return (
    <div className="flex flex-col gap-4 ">
      <p className="text-xs text-muted-foreground">Perbandingan pengeluaranmu dengan rata-rata Indonesia</p>
      {Object.entries(BENCHMARK).map(([catId, bench]) => {
        const spent = byCat.find((c) => c.category.id === catId)?.value ?? 0
        const yourPct = monthlyIncome > 0 ? Math.round((spent / monthlyIncome) * 100) : 0
        const diff = yourPct - bench.avgPct
        return (
          <div key={catId} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span>{bench.label}</span>
              <span className={cn('text-xs', diff > 5 ? 'text-destructive' : diff < -5 ? 'text-success' : 'text-muted-foreground')}>
                {diff > 0 ? `+${diff}%` : `${diff}%`} vs rata-rata
              </span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(yourPct, 100)}%` }} />
              </div>
              <span className="text-[10px] tabular-nums w-8 text-right">{yourPct}%</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-muted-foreground/50" style={{ width: `${bench.avgPct}%` }} />
              </div>
              <span className="text-[10px] tabular-nums w-8 text-right text-muted-foreground">{bench.avgPct}%</span>
            </div>
          </div>
        )
      })}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

// ─── Settings Sheet ───
function SettingsSheet({ onClose, onOpenSheet }: { onClose: () => void; onOpenSheet?: (sheet: Sheet) => void }) {
  const { monthlyIncome, updateMonthlyIncome, budgets, setBudget, theme, toggleTheme, accentColor, setAccentColor, fontSize, setFontSize, compactMode, toggleCompactMode, resetAll, transactions } = useFinwise()
  const { stats } = useGamification()
  const [incStr, setIncStr] = useState(String(monthlyIncome))
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Calculate achievements based on transactions
  const achievements = [
    { id: 'first-transaction', title: 'Transaksi Pertama', description: 'Catat transaksi pertamamu', icon: '🎉', unlocked: transactions.length >= 1 },
    { id: 'ten-transactions', title: 'Aktif Mencatat', description: 'Catat 10 transaksi', icon: '📝', unlocked: transactions.length >= 10 },
    { id: 'fifty-transactions', title: 'Master Keuangan', description: 'Catat 50 transaksi', icon: '🏆', unlocked: transactions.length >= 50 },
    { id: 'first-budget', title: 'Budget Master', description: 'Atur anggaran pertama', icon: '💰', unlocked: Object.keys(budgets).length > 0 },
    { id: 'scanner', title: 'Scanner Pro', description: 'Scan struk pertama', icon: '📸', unlocked: false },
    { id: 'saver', title: 'Hemat Hebat', description: 'Surplus 3 bulan berturut', icon: '💎', unlocked: false },
  ]

  return (
    <div className="flex flex-col gap-5 ">
      {/* Theme */}
      <div className="flex items-center justify-between">
        <span className="text-sm">Tema</span>
        <Button size="sm" variant="outline" onClick={toggleTheme} className="gap-2">
          {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
          {theme === 'dark' ? 'Dark' : 'Light'}
        </Button>
      </div>

      {/* Warna Tema */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm">Warna Aksen</Label>
        <ThemePicker />
      </div>

      {/* Font Size */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm">Ukuran Font</Label>
        <div className="flex gap-2">
          {([
            { id: 'sm' as const, label: 'Kecil', preview: 'A' },
            { id: 'base' as const, label: 'Normal', preview: 'A' },
            { id: 'lg' as const, label: 'Besar', preview: 'A' },
          ]).map((s) => (
            <button
              key={s.id}
              onClick={() => setFontSize(s.id)}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-center font-medium transition',
                fontSize === s.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-secondary'
              )}
            >
              <span className={cn(
                'block font-bold',
                s.id === 'sm' && 'text-xs',
                s.id === 'base' && 'text-sm',
                s.id === 'lg' && 'text-base'
              )}>{s.preview}</span>
              <span className="text-[10px]">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compact Mode */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm">Mode Kompak</span>
          <p className="text-[10px] text-muted-foreground">Kurangi padding & jarak elemen</p>
        </div>
        <button
          onClick={toggleCompactMode}
          aria-label={compactMode ? 'Nonaktifkan mode kompak' : 'Aktifkan mode kompak'}
          className={cn(
            'relative flex h-7 w-12 items-center rounded-full p-0.5 transition-colors',
            compactMode ? 'bg-primary' : 'bg-secondary'
          )}
        >
          <span className={cn(
            'size-6 rounded-full bg-card shadow-md transition-transform',
            compactMode && 'translate-x-5'
          )} />
        </button>
      </div>

      {/* Income */}
      <div className="flex flex-col gap-1.5">
        <Label>Pemasukan Bulanan (Rp)</Label>
        <div className="flex gap-2">
          <Input inputMode="numeric" placeholder="0" value={formatIDRInput(incStr)} onChange={(e) => setIncStr(e.target.value.replace(/\D/g, ''))} className="h-10 tabular-nums" />
          <Button size="sm" onClick={() => updateMonthlyIncome(parseIDRInput(incStr))}>Simpan</Button>
        </div>
      </div>

      {/* Budgets */}
      <div>
        <Label className="mb-3 block">Anggaran per Kategori (Rp)</Label>
        <div className="flex flex-col gap-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.id} className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-xs">{c.label}</span>
                <Input inputMode="numeric" placeholder="0" defaultValue={formatIDRInput(String(budgets[c.id] || ''))} onBlur={(e) => setBudget(c.id, parseIDRInput(e.target.value))} className="w-24 h-7 text-xs tabular-nums text-right" />
              </div>
            )
          })}
        </div>
      </div>

      {/* Export & Import */}
      <div className="border-t border-border pt-4">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => { onClose(); onOpenSheet?.('export') }}
        >
          <Download className="size-4" />
          Ekspor & Impor Data
        </Button>
      </div>

      {/* Reset Data */}
      <div className="border-t border-destructive/20 pt-4">
        {!showResetConfirm ? (
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setShowResetConfirm(true)}
          >
            🗑️ Bersihkan Semua Data
          </Button>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">⚠️ Yakin mau hapus semua?</p>
            <p className="text-xs text-muted-foreground">
              Semua transaksi, anggaran, target, dan pengaturan akan dihapus permanen. Tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowResetConfirm(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => {
                  resetAll()
                  setShowResetConfirm(false)
                  onClose()
                  // Reload to trigger setup flow
                  window.location.reload()
                }}
              >
                Ya, Hapus Semua
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2">
          <span>🏆</span> Pencapaian
        </Label>
        <AchievementsList achievements={achievements} />
      </div>

      {/* Badges */}
      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2">
          <span>🎖️</span> Badge Collection
        </Label>
        <BadgeGrid badges={stats.badges} />
      </div>

      {/* Smart Budget */}
      <Button variant="outline" className="gap-2" onClick={() => { haptic.light(); onClose(); onOpenSheet?.('smart-budget') }}>
        <span>🤖</span> Smart Budget
      </Button>

      {/* Smart Notifications */}
      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2">
          <span>🔔</span> Notifikasi
        </Label>
        <RequestNotificationButton />
      </div>

      {/* About */}
      <Link href="/about" className="w-full">
        <Button variant="outline" className="w-full gap-2">
          <span>🐱</span> Tentang FinWise
        </Button>
      </Link>

      {/* Logout */}
      <div className="border-t border-destructive/20 pt-4">
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => { onClose(); signOut({ callbackUrl: '/login' }) }}
        >
          <LogOut className="size-4" /> Keluar
        </Button>
      </div>

      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

// ─── Helper: days until due ───
function daysUntilDue(dueDay: number): number | null {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null
  const now = new Date()
  const today = now.getDate()
  if (dueDay >= today) return dueDay - today
  // Next month
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const effectiveDay = Math.min(dueDay, lastDay)
  return (lastDay - today) + effectiveDay
}

function dueBadge(dueDay: number): { label: string; color: string } | null {
  const days = daysUntilDue(dueDay)
  if (days === null) return null
  if (days === 0) return { label: '🔴 Hari ini', color: 'bg-red-500 text-white' }
  if (days === 1) return { label: '🟠 Besok', color: 'bg-orange-500 text-white' }
  if (days <= 3) return { label: `🟡 H-${days}`, color: 'bg-yellow-500 text-black' }
  if (days <= 7) return { label: `H-${days}`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }
  return { label: `H-${days}`, color: 'bg-muted text-muted-foreground' }
}

// ─── Recurring Sheet ───
function RecurringSheet({ onClose }: { onClose: () => void }) {
  const { recurring, addRecurring, toggleRecurring, deleteRecurring, updateRecurring, allCategories } = useFinwise()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('food')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<RecurringItem['frequency']>('bulanan')
  const [dueDate, setDueDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (parseIDRInput(amount) <= 0) return
    addRecurring({
      id: generateId(),
      type,
      category: type === 'income' ? 'income' : category,
      amount: parseIDRInput(amount),
      description: description || 'Transaksi berulang',
      frequency,
      active: true,
      dueDate: dueDate ? Number(dueDate) : undefined,
    })
    setAmount(''); setDescription(''); setDueDate(''); setShowForm(false)
  }

  function handleQuickDue(day: number) {
    setDueDate(String(day))
  }

  // Monthly summary
  const monthlyExpenses = recurring
    .filter(r => r.active && r.type === 'expense')
    .reduce((sum, r) => {
      if (r.frequency === 'harian') return sum + r.amount * 30
      if (r.frequency === 'mingguan') return sum + r.amount * 4
      return sum + r.amount
    }, 0)
  const monthlyIncome = recurring
    .filter(r => r.active && r.type === 'income')
    .reduce((sum, r) => {
      if (r.frequency === 'harian') return sum + r.amount * 30
      if (r.frequency === 'mingguan') return sum + r.amount * 4
      return sum + r.amount
    }, 0)

  const freqLabels: Record<string, string> = { harian: 'Harian', mingguan: 'Mingguan', bulanan: 'Bulanan' }

  // Sort by due date (closest first)
  const sorted = [...recurring].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    const da = daysUntilDue(a.dueDate) ?? 999
    const db = daysUntilDue(b.dueDate) ?? 999
    return da - db
  })

  return (
    <div className="flex flex-col gap-4 ">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 self-end"><Plus className="size-4" /> Baru</Button>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="expense">Pengeluaran</TabsTrigger><TabsTrigger value="income">Pemasukan</TabsTrigger></TabsList>
          </Tabs>
          <Input inputMode="numeric" placeholder="Jumlah (Rp)" value={formatIDRInput(amount)} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          <Input placeholder="Deskripsi" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-2">
            {(['harian', 'mingguan', 'bulanan'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFrequency(f)} className={cn('flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition', frequency === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>{freqLabels[f]}</button>
            ))}
          </div>

          {/* Due date - only for monthly */}
          {frequency === 'bulanan' && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Tanggal Jatuh Tempo (1-31)</Label>
              <div className="flex gap-1.5 flex-wrap">
                {[1, 5, 10, 15, 20, 25, 28].map(d => (
                  <button key={d} type="button" onClick={() => handleQuickDue(d)} className={cn('px-2 py-1 rounded-md text-[10px] font-medium transition', dueDate === String(d) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/15')}>
                    Tgl {d}
                  </button>
                ))}
              </div>
              <Input
                inputMode="numeric"
                placeholder="atau ketik manual (1-31)"
                value={dueDate}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '')
                  if (v === '' || (Number(v) >= 1 && Number(v) <= 31)) setDueDate(v)
                }}
                className="h-8 text-xs"
              />
            </div>
          )}

          <div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button><Button type="submit" className="flex-1">Simpan</Button></div>
        </form>
      )}
      {recurring.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Belum ada transaksi berulang</p>
      ) : (
        <>
          {/* Monthly summary */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Pengeluaran</p>
              <p className="text-sm font-bold tabular-nums text-foreground">{formatIDR(monthlyExpenses)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Pemasukan</p>
              <p className="text-sm font-bold tabular-nums text-success">{formatIDR(monthlyIncome)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Net</p>
              <p className={cn("text-sm font-bold tabular-nums", monthlyIncome - monthlyExpenses >= 0 ? 'text-success' : 'text-red-500')}>
                {formatIDR(monthlyIncome - monthlyExpenses)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {monthlyIncome > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Tagihan vs Pemasukan</span>
                <span>{Math.round((monthlyExpenses / monthlyIncome) * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", monthlyExpenses > monthlyIncome ? 'bg-red-500' : 'bg-primary')}
                  style={{ width: `${Math.min(100, (monthlyExpenses / monthlyIncome) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Items list - sorted by due date */}
          {sorted.map((item) => {
            const cat = resolveCategory(item.category, allCategories)
            const Icon = cat?.icon ?? ReceiptText
            const badge = item.dueDate ? dueBadge(item.dueDate) : null
            const isEditing = editingId === item.id
            return (
              <div key={item.id} className={cn('flex flex-col gap-2 p-2 rounded-xl border transition-colors', !item.active && 'opacity-50', isEditing ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-secondary/60')}>
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in oklch, ${cat?.color ?? 'oklch(0.5 0.1 285)'} 22%, transparent)` }}><Icon className="size-4" style={{ color: cat?.color }} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.description}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">{cat?.label} · {freqLabels[item.frequency]}</p>
                      {item.dueDate && <span className="text-[10px] text-muted-foreground">📅 Tgl {item.dueDate}</span>}
                    </div>
                  </div>
                  {badge && (
                    <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap", badge.color)}>
                      {badge.label}
                    </span>
                  )}
                  <span className={cn('text-sm font-semibold tabular-nums', item.type === 'income' ? 'text-success' : '')}>{item.type === 'income' ? '+' : '-'}{formatIDR(item.amount)}</span>
                  <button onClick={() => toggleRecurring(item.id)} aria-label={item.active ? `Nonaktifkan ${item.description}` : `Aktifkan ${item.description}`} className="text-muted-foreground">{item.active ? <ToggleRight className="size-5 text-success" /> : <ToggleLeft className="size-5" />}</button>
                  <button onClick={() => setEditingId(isEditing ? null : item.id)} aria-label="Edit" className="text-muted-foreground hover:text-primary"><Pencil className="size-4" /></button>
                  <button onClick={() => { if (window.confirm(`Hapus "${item.description}"?`)) deleteRecurring(item.id) }} aria-label={`Hapus ${item.description}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="flex flex-col gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                    {item.frequency === 'bulanan' && (
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Jatuh tempo:</Label>
                        <div className="flex gap-1 flex-wrap flex-1">
                          {[1, 5, 10, 15, 20, 25, 28].map(d => (
                            <button key={d} type="button" onClick={() => updateRecurring(item.id, { dueDate: d })} className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium transition', item.dueDate === d ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-primary/15')}>
                              {d}
                            </button>
                          ))}
                          {item.dueDate && (
                            <button type="button" onClick={() => updateRecurring(item.id, { dueDate: undefined })} className="px-1.5 py-0.5 rounded text-[9px] text-destructive hover:bg-destructive/10">✕</button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} className="text-[10px] h-7">Tutup</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

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
  const { transactions, isLocked, pin, tipsDismissed, dismissTips, allCategories, addTransaction, wallets, theme, toggleTheme } = useFinwise()
  const { stats, newBadge, clearNewBadge } = useGamification()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('home')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [monthKey, setMonthKey] = useState(getMonthKey(new Date()))
  const [isLoading, setIsLoading] = useState(true)
  const [fabOpen, setFabOpen] = useState(false)

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
          <MonthNavigator monthKey={monthKey} onChange={setMonthKey} />
          <UserAvatar onOpenSettings={() => setSheet('settings')} />
        </div>
      </header>

      {/* Quick Actions Bar */}
      <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { icon: Sparkles, label: 'AI Advisor', sheet: 'advisor' as Sheet },
          { icon: Camera, label: 'Scan', sheet: 'scan' as Sheet },
          { icon: Target, label: 'Target', sheet: 'goals' as Sheet },
          { icon: Wallet, label: 'Dompet', sheet: 'wallets' as Sheet },
          { icon: ArrowLeftRight, label: 'Transfer', sheet: 'transfer' as Sheet },
          { icon: Repeat, label: 'Berulang', sheet: 'recurring' as Sheet },
          { icon: Download, label: 'Export', sheet: 'export' as Sheet },
          { icon: Upload, label: 'Backup', sheet: 'export' as Sheet },
          { icon: BarChart3, label: 'Benchmark', sheet: 'benchmark' as Sheet },
          { icon: FileText, label: 'Kategori', sheet: 'categories' as Sheet },
          { icon: Lock, label: 'PIN', sheet: 'pin' as Sheet },
        ].map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={() => setSheet(a.sheet)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-muted transition"
              style={{ boxShadow: '0 3px 10px var(--theme-shadow, rgba(46,173,75,0.15))' }}
            >
              <Icon className="size-3.5" />{a.label}
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
              onClick={() => { haptic.medium(); setSheet('scan') }}
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
              onClick={() => { haptic.light(); setFabOpen(false); setSheet('scan') }}
              aria-label="Scan struk"
              className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-primary text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <Camera className="size-5" />
            </button>
            <button
              onClick={() => { haptic.light(); setFabOpen(false); setSheet('voice') }}
              aria-label="Voice input"
              className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-green-700 text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 delay-75"
            >
              <Mic className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Sheets */}
      <BottomSheet open={sheet === 'add'} onClose={() => setSheet(null)} title="Catat Transaksi"><AddTransactionForm onDone={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'scan'} onClose={() => setSheet(null)} title="Scan Struk"><ScanFlow onDone={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'settings'} onClose={() => setSheet(null)} title="Pengaturan"><SettingsSheet onClose={() => setSheet(null)} onOpenSheet={setSheet} /></BottomSheet>
      <BottomSheet open={sheet === 'goals'} onClose={() => setSheet(null)} title="Target Tabungan"><GoalsSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'wallets'} onClose={() => setSheet(null)} title="Dompet & Rekening"><WalletsSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'transfer'} onClose={() => setSheet(null)} title="Transfer Antar Dompet"><TransferSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'recurring'} onClose={() => setSheet(null)} title="Transaksi Berulang"><RecurringSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'export'} onClose={() => setSheet(null)} title="Export & Backup"><ExportSheetNew onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'categories'} onClose={() => setSheet(null)} title="Kategori Custom"><CategoriesSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'pin'} onClose={() => setSheet(null)} title="Pengaman PIN"><PinSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'benchmark'} onClose={() => setSheet(null)} title="Benchmark"><BenchmarkSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'advisor'} onClose={() => setSheet(null)} title="AI Advisor"><AdvisorChat /></BottomSheet>
      <BottomSheet open={sheet === 'smart-budget'} onClose={() => setSheet(null)} title="🤖 Smart Budget"><SmartBudgetSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'split-bill'} onClose={() => setSheet(null)} title="👥 Split Bill"><SplitBillSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'notifications'} onClose={() => setSheet(null)} title="🔔 Notifikasi"><NotificationCenter onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'voice'} onClose={() => setSheet(null)} title="🎤 Voice Input"><VoiceInput onResult={(parsed) => {
          const defaultWallet = wallets[0]?.id || 'cash'
          addTransaction({
            type: parsed.type,
            category: parsed.category,
            amount: parsed.amount,
            description: parsed.note,
            date: new Date().toISOString().slice(0, 10),
            walletId: defaultWallet,
          })
          setSheet(null)
        }} /></BottomSheet>

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
          <Image src="/mascot-128.png?v=3" alt="FinWise" width={64} height={64} className="animate-pulse drop-shadow-lg" />
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

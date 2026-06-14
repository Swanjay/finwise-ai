'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  BarChart3, Camera, Home, ListChecks, Plus, Sparkles, Wallet,
  Settings, ChevronLeft, ChevronRight, Target, Repeat, Download,
  FileText, Lock, Lightbulb, Bell, TrendingUp, ArrowDownRight,
  ArrowUpRight, Search, Filter, X, Check, Trash2, ToggleLeft,
  ToggleRight, CalendarClock, Shield, Eye, EyeOff, Moon, Sun,
  PiggyBank, ReceiptText, ShieldCheck, Upload, LogOut,
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
import FinWiseLogo from '@/components/finwise-logo'
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
  autoCategory, generateId,
  type CategoryId, type Transaction, type Category, type TxType,
  type Wallet as WalletType, type Goal, type RecurringItem,
} from '@/lib/finwise'
import { cn } from '@/lib/utils'

type Tab = 'home' | 'transactions' | 'trends' | 'budget'
type Sheet = 'add' | 'scan' | 'advisor' | 'settings' | 'goals' | 'wallets' | 'recurring' | 'export' | 'categories' | 'pin' | 'benchmark' | null

// ─── Onboarding ───
function OnboardingFlow() {
  const { completeSetup } = useFinwise()
  const [step, setStep] = useState(0)
  const [incomeStr, setIncomeStr] = useState('')
  const [budgetValues, setBudgetValues] = useState<Record<string, string>>({})

  function handleFinish() {
    const inc = Number(incomeStr) || 0
    const b: Partial<Record<string, number>> = {}
    EXPENSE_CATEGORIES.forEach((c) => {
      const v = Number(budgetValues[c.id]) || 0
      if (v > 0) b[c.id] = v
    })
    completeSetup(inc, b)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-2 mb-8">
        <Sparkles className="size-10 text-accent" />
        <h1 className="font-heading text-3xl font-bold">FinWise</h1>
        <p className="text-sm text-muted-foreground text-center">Atur keuangan pribadi dengan lebih pintar</p>
      </div>
      {step === 0 && (
        <Card className="w-full border-primary/30">
          <CardHeader><CardTitle className="font-heading text-base">💰 Berapa pemasukan bulananmu?</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Pemasukan per bulan (Rp)</Label>
              <Input inputMode="numeric" placeholder="0" value={incomeStr} onChange={(e) => setIncomeStr(e.target.value.replace(/\D/g, ''))} className="h-12 text-lg tabular-nums" autoFocus />
              <p className="text-xs text-muted-foreground">Isi 0 jika belum tahu, bisa diubah nanti</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setIncomeStr('0'); setStep(1) }}>Lewati</Button>
              <Button className="flex-1" onClick={() => setStep(1)}>Lanjut</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {step === 1 && (
        <Card className="w-full border-primary/30">
          <CardHeader><CardTitle className="font-heading text-base">📊 Atur Anggaran per Kategori</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">Opsional — kosongkan atau isi 0 jika tidak ingin set limit</p>
            {EXPENSE_CATEGORIES.map((c) => {
              const Icon = c.icon
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in oklch, ${c.color} 22%, transparent)` }}>
                    <Icon className="size-4" style={{ color: c.color }} />
                  </div>
                  <Label className="flex-1 text-sm">{c.label}</Label>
                  <Input inputMode="numeric" placeholder="0" value={budgetValues[c.id] || ''} onChange={(e) => setBudgetValues((prev) => ({ ...prev, [c.id]: e.target.value.replace(/\D/g, '') }))} className="w-28 h-8 text-xs tabular-nums text-right" />
                </div>
              )
            })}
            <div className="flex gap-2 mt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(0)}>Kembali</Button>
              <Button className="flex-1" onClick={handleFinish}>🚀 Mulai</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── PIN Lock Screen ───
function PinLock() {
  const { pin, unlock } = useFinwise()
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [showPin, setShowPin] = useState(false)

  if (!pin) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input === pin) { unlock() }
    else { setError(true); setTimeout(() => setError(false), 1000) }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6">
      <Lock className="size-12 text-primary mb-4" />
      <h1 className="font-heading text-xl font-bold mb-6">Masukkan PIN</h1>
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <div className="relative">
          <Input type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={6} placeholder="PIN" value={input} onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))} className={cn('h-12 text-center text-2xl tracking-[0.5em] tabular-nums', error && 'border-destructive animate-shake')} autoFocus />
          <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
        </div>
        {error && <p className="text-xs text-destructive text-center">PIN salah</p>}
        <Button type="submit" disabled={input.length < 4}>Buka</Button>
      </form>
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
      <button onClick={() => shift(-1)} className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /></button>
      <span className="min-w-[5rem] text-center text-sm font-medium">{getMonthLabel(monthKey)}</span>
      <button onClick={() => shift(1)} className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"><ChevronRight className="size-4" /></button>
    </div>
  )
}

// ─── Export Sheet ───
function ExportSheet({ onClose, monthKey }: { onClose: () => void; monthKey: string }) {
  const { transactions, allCategories } = useFinwise()
  const filtered = filterByMonth(transactions, monthKey)

  function exportCSV() {
    const header = 'Tanggal,Tipe,Kategori,Deskripsi,Jumlah\n'
    const rows = filtered.map((t) => `${t.date},${t.type},${allCategories[t.category]?.label ?? t.category},"${t.description}",${t.amount}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `finwise-${monthKey}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function exportJSON() {
    const data = { month: monthKey, transactions: filtered, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `finwise-backup-${monthKey}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Export data {getMonthLabel(monthKey)}</p>
      <Button onClick={exportCSV} className="gap-2"><Download className="size-4" /> Export CSV</Button>
      <Button onClick={exportJSON} variant="outline" className="gap-2"><FileText className="size-4" /> Export JSON (Backup)</Button>
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

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
    if (!name || Number(target) <= 0) return
    addGoal({ id: generateId(), name, targetAmount: Number(target), currentAmount: 0, deadline: deadline || '2026-12-31', icon: '🎯', color: COLOR_PRESETS[goals.length % COLOR_PRESETS.length] })
    setName(''); setTarget(''); setDeadline(''); setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 self-end"><Plus className="size-4" /> Baru</Button>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Input placeholder="Nama target (e.g. Laptop baru)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input inputMode="numeric" placeholder="Target nominal (Rp)" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} />
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
                <button onClick={() => deleteGoal(g.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
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
  const { wallets, addWallet, updateWallet, deleteWallet } = useFinwise()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💵')
  const [initBalance, setInitBalance] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    const balance = Number(initBalance.replace(/\D/g, '')) || 0
    addWallet({ id: generateId(), name, icon, balance, color: COLOR_PRESETS[wallets.length % COLOR_PRESETS.length] })
    setName(''); setInitBalance(''); setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 self-end"><Plus className="size-4" /> Baru</Button>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Input placeholder="Nama dompet (e.g. GoPay)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input inputMode="numeric" placeholder="Saldo awal (Rp)" value={initBalance} onChange={(e) => setInitBalance(e.target.value)} />
          <div className="flex gap-2">
            {['💵', '🏦', '📱', '💳', '🪙'].map((e) => (
              <button key={e} type="button" onClick={() => setIcon(e)} className={cn('text-2xl p-2 rounded-lg', icon === e ? 'bg-primary/20' : 'bg-secondary')}>{e}</button>
            ))}
          </div>
          <div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button><Button type="submit" className="flex-1">Simpan</Button></div>
        </form>
      )}
      {wallets.map((w) => (
        <Card key={w.id}>
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-2xl">{w.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-sm">{w.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatIDR(w.balance)}</p>
            </div>
            <Input inputMode="numeric" placeholder="Saldo" className="w-28 h-7 text-xs text-right" defaultValue={w.balance || ''} onBlur={(e) => updateWallet(w.id, { balance: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            <button onClick={() => deleteWallet(w.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </CardContent>
        </Card>
      ))}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
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
    <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 self-end"><Plus className="size-4" /> Kategori Baru</Button>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Input placeholder="Nama kategori" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="expense">Pengeluaran</TabsTrigger><TabsTrigger value="income">Pemasukan</TabsTrigger></TabsList>
          </Tabs>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PRESETS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn('size-6 rounded-full', color === c && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} style={{ backgroundColor: c }} />
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
            <button onClick={() => deleteCustomCategory(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
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

  function handleSave() {
    if (newPin.length < 4) { setError('PIN minimal 4 digit'); return }
    if (newPin !== confirm) { setError('PIN tidak cocok'); return }
    setPin(newPin); onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      {pin && (
        <div className="p-3 rounded-xl bg-secondary text-sm">
          <p>PIN aktif: {'•'.repeat(pin.length)}</p>
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
    <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
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
function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { monthlyIncome, updateMonthlyIncome, budgets, setBudget, theme, toggleTheme, resetAll } = useFinwise()
  const [incStr, setIncStr] = useState(String(monthlyIncome))
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  return (
    <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
      {/* Theme */}
      <div className="flex items-center justify-between">
        <span className="text-sm">Tema</span>
        <Button size="sm" variant="outline" onClick={toggleTheme} className="gap-2">
          {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
          {theme === 'dark' ? 'Dark' : 'Light'}
        </Button>
      </div>

      {/* Income */}
      <div className="flex flex-col gap-1.5">
        <Label>Pemasukan Bulanan (Rp)</Label>
        <div className="flex gap-2">
          <Input inputMode="numeric" placeholder="0" value={incStr} onChange={(e) => setIncStr(e.target.value.replace(/\D/g, ''))} className="h-10 tabular-nums" />
          <Button size="sm" onClick={() => updateMonthlyIncome(Number(incStr) || 0)}>Simpan</Button>
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
                <Input inputMode="numeric" placeholder="0" defaultValue={budgets[c.id] || ''} onBlur={(e) => setBudget(c.id, Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-24 h-7 text-xs tabular-nums text-right" />
              </div>
            )
          })}
        </div>
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

      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

// ─── Recurring Sheet ───
function RecurringSheet({ onClose }: { onClose: () => void }) {
  const { recurring, addRecurring, toggleRecurring, deleteRecurring, allCategories } = useFinwise()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>('food')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<RecurringItem['frequency']>('bulanan')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (Number(amount) <= 0) return
    addRecurring({ id: generateId(), type, category: type === 'income' ? 'income' : category, amount: Number(amount), description: description || 'Transaksi berulang', frequency, active: true })
    setAmount(''); setDescription(''); setShowForm(false)
  }

  const freqLabels: Record<string, string> = { harian: 'Harian', mingguan: 'Mingguan', bulanan: 'Bulanan' }

  return (
    <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 self-end"><Plus className="size-4" /> Baru</Button>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="expense">Pengeluaran</TabsTrigger><TabsTrigger value="income">Pemasukan</TabsTrigger></TabsList>
          </Tabs>
          <Input inputMode="numeric" placeholder="Jumlah (Rp)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          <Input placeholder="Deskripsi" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-2">
            {(['harian', 'mingguan', 'bulanan'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFrequency(f)} className={cn('flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition', frequency === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>{freqLabels[f]}</button>
            ))}
          </div>
          <div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button><Button type="submit" className="flex-1">Simpan</Button></div>
        </form>
      )}
      {recurring.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Belum ada transaksi berulang</p>
      ) : recurring.map((item) => {
        const cat = allCategories[item.category]
        const Icon = cat?.icon ?? ReceiptText
        return (
          <div key={item.id} className={cn('flex items-center gap-3 p-2 rounded-lg', !item.active && 'opacity-50')}>
            <span className="flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in oklch, ${cat?.color ?? 'oklch(0.5 0.1 285)'} 22%, transparent)` }}><Icon className="size-4" style={{ color: cat?.color }} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.description}</p>
              <p className="text-xs text-muted-foreground">{cat?.label} · {freqLabels[item.frequency]}</p>
            </div>
            <span className={cn('text-sm font-semibold tabular-nums', item.type === 'income' ? 'text-success' : '')}>{item.type === 'income' ? '+' : '-'}{formatIDR(item.amount)}</span>
            <button onClick={() => toggleRecurring(item.id)} className="text-muted-foreground">{item.active ? <ToggleRight className="size-5 text-success" /> : <ToggleLeft className="size-5" />}</button>
            <button onClick={() => deleteRecurring(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </div>
        )
      })}
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
                <Input inputMode="numeric" placeholder="0" defaultValue={budgets[c.id] || ''} onBlur={(e) => setBudget(c.id, Number(e.target.value.replace(/\D/g, '')) || 0)} className="w-28 h-8 text-xs tabular-nums text-right" />
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
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
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
function UserAvatar() {
  const { data: session } = useSession()
  const [showMenu, setShowMenu] = useState(false)
  const user = session?.user
  if (!user) return null

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)} className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary/20 ring-2 ring-primary/30">
        {user.image ? (
          <img src={user.image} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-primary">{(user.name || 'U')[0].toUpperCase()}</span>
        )}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-border bg-card p-3 shadow-xl">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-primary/20">
                {user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : <span className="text-sm font-bold text-primary">{(user.name || 'U')[0].toUpperCase()}</span>}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email || 'Telegram'}</p>
              </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10">
              <LogOut className="size-4" /> Keluar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main App Shell ───
function AppShell() {
  const { transactions, setupDone, isLocked, pin, tipsDismissed, dismissTips, allCategories } = useFinwise()
  const [tab, setTab] = useState<Tab>('home')
  const [sheet, setSheet] = useState<Sheet>(null)
  const [monthKey, setMonthKey] = useState(getMonthKey(new Date()))

  const monthTx = useMemo(() => filterByMonth(transactions, monthKey), [transactions, monthKey])

  if (!setupDone) return <OnboardingFlow />
  if (isLocked && pin) return <PinLock />

  const navItems: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'transactions', label: 'Transaksi', icon: ListChecks },
    { id: 'trends', label: 'Tren', icon: BarChart3 },
    { id: 'budget', label: 'Anggaran', icon: Wallet },
  ]

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <div className="flex items-center gap-2.5">
          <FinWiseLogo size={36} showText={false} />
        </div>
        <div className="flex items-center gap-2">
          <MonthNavigator monthKey={monthKey} onChange={setMonthKey} />
          <button onClick={() => setSheet('settings')} className="flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"><Settings className="size-4" /></button>
          <UserAvatar />
        </div>
      </header>
      {/* Page title */}
      <div className="px-5 pb-1">
        <p className="text-xs text-muted-foreground">{getMonthLabel(monthKey)}</p>
        <h1 className="font-heading text-xl font-bold">
          {tab === 'home' && 'Dashboard'}
          {tab === 'transactions' && 'Transaksi'}
          {tab === 'trends' && 'Tren Keuangan'}
          {tab === 'budget' && 'Anggaran'}
        </h1>
      </div>

      {/* Quick Actions Bar */}
      <div className="px-5 pb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { icon: Sparkles, label: 'AI Advisor', sheet: 'advisor' as Sheet },
          { icon: Camera, label: 'Scan', sheet: 'scan' as Sheet },
          { icon: Target, label: 'Target', sheet: 'goals' as Sheet },
          { icon: Wallet, label: 'Dompet', sheet: 'wallets' as Sheet },
          { icon: Repeat, label: 'Berulang', sheet: 'recurring' as Sheet },
          { icon: Download, label: 'Export', sheet: 'export' as Sheet },
          { icon: Upload, label: 'Backup', sheet: 'export' as Sheet },
          { icon: BarChart3, label: 'Benchmark', sheet: 'benchmark' as Sheet },
          { icon: FileText, label: 'Kategori', sheet: 'categories' as Sheet },
          { icon: Lock, label: 'PIN', sheet: 'pin' as Sheet },
        ].map((a) => {
          const Icon = a.icon
          return (
            <button key={a.label} onClick={() => setSheet(a.sheet)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition">
              <Icon className="size-3.5" />{a.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <main className="flex-1 px-5 pb-32">
        {!tipsDismissed && tab === 'home' && <OnboardingTips onDismiss={dismissTips} />}
        {tab === 'home' && <DashboardView transactions={monthTx} month={getMonthLabel(monthKey)} />}
        {tab === 'transactions' && <TransactionsView />}
        {tab === 'trends' && <TrendsView />}
        {tab === 'budget' && <BudgetTab transactions={monthTx} />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-5 items-end px-2 py-2">
          {navItems.slice(0, 2).map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={cn('flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition', tab === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
              <item.icon className="size-5" />{item.label}
            </button>
          ))}
          <div className="flex justify-center">
            <button onClick={() => setSheet('scan')} className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground neon-glow transition active:scale-95"><Camera className="size-6" /></button>
          </div>
          {navItems.slice(2).map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} className={cn('flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition', tab === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
              <item.icon className="size-5" />{item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* FAB */}
      <button onClick={() => setSheet('add')} className="fixed bottom-24 right-5 z-30 flex size-12 items-center justify-center rounded-full bg-secondary text-foreground shadow-lg transition active:scale-95 sm:hidden"><Plus className="size-5" /></button>

      {/* Bottom Sheets */}
      <BottomSheet open={sheet === 'add'} onClose={() => setSheet(null)} title="Catat Transaksi"><AddTransactionForm onDone={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'scan'} onClose={() => setSheet(null)} title="Scan Struk"><ScanFlow onDone={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'settings'} onClose={() => setSheet(null)} title="Pengaturan"><SettingsSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'goals'} onClose={() => setSheet(null)} title="Target Tabungan"><GoalsSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'wallets'} onClose={() => setSheet(null)} title="Dompet & Rekening"><WalletsSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'recurring'} onClose={() => setSheet(null)} title="Transaksi Berulang"><RecurringSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'export'} onClose={() => setSheet(null)} title="Export & Backup"><ExportSheet onClose={() => setSheet(null)} monthKey={monthKey} /></BottomSheet>
      <BottomSheet open={sheet === 'categories'} onClose={() => setSheet(null)} title="Kategori Custom"><CategoriesSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'pin'} onClose={() => setSheet(null)} title="Pengaman PIN"><PinSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'benchmark'} onClose={() => setSheet(null)} title="Benchmark"><BenchmarkSheet onClose={() => setSheet(null)} /></BottomSheet>
      <BottomSheet open={sheet === 'advisor'} onClose={() => setSheet(null)} title="AI Advisor"><AdvisorChat /></BottomSheet>
    </div>
  )
}

export default function Page() {
  return (
    <FinwiseProvider>
      <SplashScreen />
      <AppShell />
    </FinwiseProvider>
  )
}

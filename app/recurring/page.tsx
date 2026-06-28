'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Plus,
  Repeat,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { FinwiseProvider } from '@/components/finwise-store'
import {
  formatIDR,
  EXPENSE_CATEGORIES,
  CATEGORIES,
  formatIDRInput,
  parseIDRInput,
  type CategoryId,
  type TxType,
} from '@/lib/finwise'
import { cn } from '@/lib/utils'

interface RecurringItem {
  id: string
  type: TxType
  category: CategoryId
  amount: number
  description: string
  frequency: 'harian' | 'mingguan' | 'bulanan'
  active: boolean
}

const STORAGE_KEY = 'finwise.recurring.v1'

function RecurringContent() {
  const [items, setItems] = useState<RecurringItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<RecurringItem['frequency']>('bulanan')

  function saveItems(newItems: RecurringItem[]) {
    setItems(newItems)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems))
    } catch { /* ignore */ }
  }

  function toggleActive(id: string) {
    saveItems(
      items.map((item) =>
        item.id === id ? { ...item, active: !item.active } : item,
      ),
    )
  }

  function removeItem(id: string) {
    saveItems(items.filter((item) => item.id !== id))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (parseIDRInput(amount) <= 0) return
    const newItem: RecurringItem = {
      id: `r${Date.now()}`,
      type,
      category: type === 'income' ? 'income' : category,
      amount: parseIDRInput(amount),
      description: description || 'Transaksi berulang',
      frequency,
      active: true,
    }
    saveItems([newItem, ...items])
    setAmount('')
    setDescription('')
    setShowForm(false)
  }

  const activeCount = items.filter((i) => i.active).length
  const totalMonthly = items
    .filter((i) => i.active && i.frequency === 'bulanan')
    .reduce((sum, i) => sum + (i.type === 'expense' ? -i.amount : i.amount), 0)

  const frequencyLabels: Record<RecurringItem['frequency'], string> = {
    harian: 'Harian',
    mingguan: 'Mingguan',
    bulanan: 'Bulanan',
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-accent" /> FinWise AI
            </p>
            <h1 className="font-heading text-xl font-bold">Transaksi Berulang</h1>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1"
        >
          <Plus className="size-4" />
          Baru
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Repeat className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aktif</p>
              <p className="font-heading text-lg font-bold tabular-nums">
                {activeCount} / {items.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
              <CalendarClock className="size-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Efek Bulanan</p>
              <p
                className={cn(
                  'font-heading text-lg font-bold tabular-nums',
                  totalMonthly >= 0 ? 'text-success' : 'text-foreground',
                )}
              >
                {formatIDR(totalMonthly)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Tambah Transaksi Berulang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
                  <TabsTrigger value="income">Pemasukan</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rec-amount">Jumlah (Rp)</Label>
                <Input
                  id="rec-amount"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatIDRInput(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className="h-10 tabular-nums"
                />
              </div>

              {type === 'expense' && (
                <div className="flex flex-col gap-1.5">
                  <Label>Kategori</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EXPENSE_CATEGORIES.map((c) => {
                      const Icon = c.icon
                      const active = category === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(c.id)}
                          className={cn(
                            'flex flex-col items-center gap-0.5 rounded-lg border p-1.5 text-[10px] transition',
                            active
                              ? 'border-primary bg-primary/15 text-foreground'
                              : 'border-border text-muted-foreground hover:bg-secondary',
                          )}
                        >
                          <Icon className="size-3.5" />
                          <span className="truncate">{c.label.split(' ')[0]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rec-desc">Deskripsi</Label>
                <Input
                  id="rec-desc"
                  placeholder="Contoh: Langganan streaming"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Frekuensi</Label>
                <div className="flex gap-2">
                  {(['harian', 'mingguan', 'bulanan'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={cn(
                        'flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition',
                        frequency === f
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {frequencyLabels[f]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  <X className="size-4" /> Batal
                </Button>
                <Button
                  type="submit"
                  disabled={parseIDRInput(amount) <= 0}
                  className="flex-1"
                >
                  <Check className="size-4" /> Simpan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Recurring Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <Repeat className="size-4 text-primary" />
            Daftar Berulang
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CalendarClock className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Belum ada transaksi berulang.
              </p>
              <p className="text-xs text-muted-foreground">
                Tambahkan tagihan bulanan, gaji, atau langganan di sini
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {items.map((item) => {
                const cat = CATEGORIES[item.category]
                const Icon = cat.icon
                const isIncome = item.type === 'income'
                return (
                  <li
                    key={item.id}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-secondary/60',
                      !item.active && 'opacity-50',
                    )}
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${cat.color} 22%, transparent)`,
                      }}
                    >
                      <Icon className="size-5" style={{ color: cat.color }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cat.label} · {frequencyLabels[item.frequency]}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'mr-1 tabular-nums text-sm font-semibold',
                        isIncome ? 'text-success' : 'text-foreground',
                      )}
                    >
                      {isIncome ? '+' : '-'}
                      {formatIDR(item.amount)}
                    </span>
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleActive(item.id)}
                      className="rounded-md p-1 text-muted-foreground transition hover:text-foreground"
                      aria-label={item.active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {item.active ? (
                        <ToggleRight className="size-5 text-success" />
                      ) : (
                        <ToggleLeft className="size-5" />
                      )}
                    </button>
                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                      aria-label={`Hapus ${item.description}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function RecurringPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-6">
      <FinwiseProvider>
        <RecurringContent />
      </FinwiseProvider>
    </div>
  )
}

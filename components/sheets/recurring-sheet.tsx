'use client'

import { useState } from 'react'
import { Plus, ToggleLeft, ToggleRight, Trash2, Pencil, ReceiptText } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatIDR, formatIDRInput, parseIDRInput, generateId, resolveCategory, type TxType, type RecurringItem } from '@/lib/finwise'
import { cn } from '@/lib/utils'

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

function RecurringSheetContent({ onClose }: { onClose: () => void }) {
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
    
    try {
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
    } catch (error) {
      console.error('[recurring] Submit failed:', error)
      alert('Gagal menyimpan transaksi berulang. Coba lagi.')
    }
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

export function RecurringSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Transaksi Berulang">
      <RecurringSheetContent onClose={onClose} />
    </BottomSheet>
  )
}

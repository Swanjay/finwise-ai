'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  EXPENSE_CATEGORIES,
  type CategoryId,
  type TxType,
} from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { cn } from '@/lib/utils'

export function AddTransactionForm({ onDone }: { onDone: () => void }) {
  const { addTransaction } = useFinwise()
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const valid = Number(amount) > 0 && !isSubmitting

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || isSubmitting) return
    
    setIsSubmitting(true)
    
    // Simulate slight delay to prevent double-click
    setTimeout(() => {
      addTransaction({
        type,
        category: type === 'income' ? 'income' : category,
        amount: Number(amount),
        description: description || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
        date,
      })
      onDone()
    }, 100)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
          <TabsTrigger value="income">Pemasukan</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Jumlah (Rp)</Label>
        <Input
          id="amount"
          inputMode="numeric"
          autoFocus
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          className="h-12 text-lg tabular-nums"
        />
      </div>

      {type === 'expense' && (
        <div className="flex flex-col gap-1.5">
          <Label>Kategori</Label>
          <div className="grid grid-cols-4 gap-2">
            {EXPENSE_CATEGORIES.map((c) => {
              const Icon = c.icon
              const active = category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] transition',
                    active
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary',
                  )}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{c.label.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="desc">Deskripsi</Label>
        <Input
          id="desc"
          placeholder="Contoh: Makan siang"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">Tanggal</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <Button type="submit" disabled={!valid} className="h-12">
        {isSubmitting ? (
          <>
            <span className="animate-spin">⏳</span> Menyimpan...
          </>
        ) : (
          <>
            <Check className="size-5" /> Simpan Transaksi
          </>
        )}
      </Button>
    </form>
  )
}

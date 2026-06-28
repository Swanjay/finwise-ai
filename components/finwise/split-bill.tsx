'use client'

import { useState } from 'react'
import { Users, Plus, X, Calculator, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatIDR, formatIDRInput, parseIDRInput } from '@/lib/finwise'
import { cn } from '@/lib/utils'

interface SplitPerson {
  name: string
  amount: number
}

export function SplitBillSheet({ onClose }: { onClose: () => void }) {
  const [totalAmount, setTotalAmount] = useState('')
  const [description, setDescription] = useState('')
  const [people, setPeople] = useState<SplitPerson[]>([
    { name: 'Kamu', amount: 0 },
    { name: '', amount: 0 },
  ])
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [showResult, setShowResult] = useState(false)

  const total = parseIDRInput(totalAmount)
  const validPeople = people.filter((p) => p.name.trim())
  const equalAmount = validPeople.length > 0 ? Math.ceil(total / validPeople.length) : 0

  function addPerson() {
    setPeople((prev) => [...prev, { name: '', amount: 0 }])
  }

  function removePerson(index: number) {
    if (people.length <= 2) return
    setPeople((prev) => prev.filter((_, i) => i !== index))
  }

  function updatePerson(index: number, field: 'name' | 'amount', value: string) {
    setPeople((prev) =>
      prev.map((p, i) =>
        i === index
          ? { ...p, [field]: field === 'amount' ? parseIDRInput(value) : value }
          : p
      )
    )
  }

  function calculateSplit() {
    if (splitMode === 'equal') {
      setPeople((prev) => prev.map((p) => ({ ...p, amount: equalAmount })))
    }
    setShowResult(true)
  }

  function copyResults() {
    const lines = [
      `🐱 Split Bill: ${description || 'Makan bareng'}`,
      `💰 Total: ${formatIDR(total)}`,
      '',
      ...validPeople.map((p) => {
        const amt = splitMode === 'equal' ? equalAmount : p.amount
        return `• ${p.name}: ${formatIDR(amt)}`
      }),
      '',
      'Dihitung pakai FinWise 🐱 finny.biz.id',
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      alert('Hasil split bill sudah disalin!')
    })
  }

  return (
    <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto">
      <p className="text-sm text-muted-foreground">
        Hitung split bill dengan teman-teman. Bisa dibagi rata atau sesuai porsi masing-masing.
      </p>

      {/* Total Amount */}
      <div className="flex flex-col gap-1.5">
        <Label>Total Tagihan (Rp)</Label>
        <Input
          inputMode="numeric"
          placeholder="0"
          value={formatIDRInput(totalAmount)}
          onChange={(e) => setTotalAmount(e.target.value.replace(/\D/g, ''))}
          className="h-12 text-lg tabular-nums"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label>Keterangan (opsional)</Label>
        <Input
          placeholder="Contoh: Makan di Pizza Hut"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Split Mode */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSplitMode('equal')}
          className={cn(
            'flex-1 rounded-xl px-3 py-2 text-xs font-medium transition',
            splitMode === 'equal'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          ⚖️ Bagi Rata
        </button>
        <button
          type="button"
          onClick={() => setSplitMode('custom')}
          className={cn(
            'flex-1 rounded-xl px-3 py-2 text-xs font-medium transition',
            splitMode === 'custom'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          ✏️ Custom
        </button>
      </div>

      {/* People */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <Users className="size-3.5" /> Orang ({people.length})
          </Label>
          <Button type="button" variant="ghost" size="sm" onClick={addPerson} className="h-7 gap-1 text-xs">
            <Plus className="size-3" /> Tambah
          </Button>
        </div>

        {people.map((person, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </div>
            <Input
              placeholder={i === 0 ? 'Kamu' : `Nama ${i + 1}`}
              value={person.name}
              onChange={(e) => updatePerson(i, 'name', e.target.value)}
              className="flex-1"
            />
            {splitMode === 'custom' && (
              <Input
                inputMode="numeric"
                placeholder="Rp"
                value={person.amount ? formatIDRInput(String(person.amount)) : ''}
                onChange={(e) => updatePerson(i, 'amount', e.target.value.replace(/\D/g, ''))}
                className="w-28 tabular-nums"
              />
            )}
            {splitMode === 'equal' && total > 0 && validPeople.length > 0 && (
              <span className="w-28 text-right text-sm tabular-nums text-muted-foreground">
                {formatIDR(equalAmount)}
              </span>
            )}
            {people.length > 2 && (
              <button
                type="button"
                onClick={() => removePerson(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Calculate */}
      {!showResult ? (
        <Button
          onClick={calculateSplit}
          disabled={total <= 0 || validPeople.length < 2}
          className="gap-2"
        >
          <Calculator className="size-4" /> Hitung Split
        </Button>
      ) : (
        <div className="clay-card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <div>
              <p className="text-sm font-bold">Hasil Split Bill</p>
              <p className="text-xs text-muted-foreground">{description || 'Split bill'}</p>
            </div>
            <span className="ml-auto text-lg font-bold text-primary">{formatIDR(total)}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {validPeople.map((p, i) => {
              const amt = splitMode === 'equal' ? equalAmount : p.amount
              return (
                <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                  <span className="text-sm">{p.name}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatIDR(amt)}</span>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={copyResults} className="flex-1 gap-2">
              <Share2 className="size-4" /> Salin Hasil
            </Button>
            <Button variant="outline" onClick={() => setShowResult(false)} className="flex-1 gap-2">
              ✏️ Edit
            </Button>
          </div>
        </div>
      )}

      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

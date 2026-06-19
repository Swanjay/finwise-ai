'use client'

import { useState, useRef } from 'react'
import { Check, X, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { EXPENSE_CATEGORIES, walletAutoCategory, type CategoryId, type TxType } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { LocationPicker, type LocationData } from '@/components/finwise/location-picker'
import { cn } from '@/lib/utils'
import { CustomKeypad } from '@/components/finwise/custom-keypad'

export function AddTransactionForm({ onDone }: { onDone: () => void }) {
  const { addTransaction, tags: savedTags, addTag: saveTag, wallets } = useFinwise()
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [walletId, setWalletId] = useState(wallets[0]?.id || 'cash')
  const tagInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const valid = Number(amount) > 0 && !isSubmitting

  const tagSuggestions = savedTags.filter(
    (t) => !selectedTags.includes(t) && t.includes(tagInput.toLowerCase().trim())
  )

  function addTagToTransaction(tag: string) {
    const clean = tag.trim().toLowerCase()
    if (!clean || selectedTags.includes(clean)) return
    setSelectedTags((prev) => [...prev, clean])
    saveTag(clean)
    setTagInput('')
    setShowTagSuggestions(false)
  }

  function removeTag(tag: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== tag))
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      addTagToTransaction(tagInput)
    }
    if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1])
    }
  }

  function saveTransaction() {
    if (!valid || isSubmitting) return
    
    setIsSubmitting(true)
    
    setTimeout(() => {
      addTransaction({
        type,
        category: type === 'income' ? 'income' : category,
        amount: Number(amount),
        description: description || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
        date,
        walletId,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        location: location || undefined,
      })
      onDone()
    }, 100)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    saveTransaction()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
          <TabsTrigger value="income">Pemasukan</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Custom Keypad with Calculator */}
      <CustomKeypad
        value={amount}
        onChange={setAmount}
        onConfirm={saveTransaction}
        type={type}
      />

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

      {/* Wallet selector */}
      <div className="flex flex-col gap-1.5">
        <Label>{type === 'expense' ? 'Ambil dari Dompet' : 'Masuk ke Dompet'}</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {wallets.map((w) => {
            const active = walletId === w.id
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setWalletId(w.id)
                  // Auto-suggest category based on wallet
                  if (type === 'expense') {
                    const hint = walletAutoCategory(w.id, description)
                    if (hint) setCategory(hint)
                  }
                }}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] transition',
                  active
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-secondary',
                )}
              >
                <span className="text-base">{w.icon}</span>
                <span className="truncate font-medium">{w.name}</span>
              </button>
            )
          })}
        </div>
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

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <Label className="flex items-center gap-1.5">
          <Tag className="size-3.5" /> Tags <span className="text-xs text-muted-foreground">(opsional)</span>
        </Label>
        <div className="relative">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-background p-2 min-h-[42px] focus-within:border-primary transition-colors">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              placeholder={selectedTags.length === 0 ? 'Tambah tag...' : ''}
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value)
                setShowTagSuggestions(true)
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              onKeyDown={handleTagKeyDown}
              className="flex-1 min-w-[60px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          
          {/* Tag suggestions */}
          {showTagSuggestions && (tagInput.trim() || tagSuggestions.length > 0) && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover p-1.5 shadow-lg">
              {tagInput.trim() && !savedTags.includes(tagInput.trim().toLowerCase()) && (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addTagToTransaction(tagInput) }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-secondary transition"
                >
                  <span className="text-primary font-medium">+</span> Buat tag &quot;{tagInput.trim()}&quot;
                </button>
              )}
              {tagSuggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addTagToTransaction(tag) }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-secondary transition"
                >
                  <span className="text-muted-foreground">#</span> {tag}
                </button>
              ))}
              {tagInput.trim() && tagSuggestions.length === 0 && savedTags.includes(tagInput.trim().toLowerCase()) && (
                <p className="px-2.5 py-1.5 text-xs text-muted-foreground">Tag sudah dipilih</p>
              )}
            </div>
          )}
        </div>
      </div>

      <LocationPicker value={location} onChange={setLocation} />

      {/* Submit button - also accessible at bottom */}
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

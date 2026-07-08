'use client'

import { useState, useRef, useMemo } from 'react'
import { Check, X, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EXPENSE_CATEGORIES, walletAutoCategory, formatIDRShort, parseIDRInput, type CategoryId, type TxType } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { LocationPicker, type LocationData } from '@/components/finwise/location-picker'
import { cn } from '@/lib/utils'
import { CustomKeypad } from '@/components/finwise/custom-keypad'
import { detectLogo } from '@/lib/brand-logos'
import { useFeatureAccess } from '@/hooks/use-feature-access'
import { getFeatureLimit, canAccess } from '@/lib/plans'

export function AddTransactionForm({ onDone }: { onDone: () => void }) {
  const { addTransaction, tags: savedTags, addTag: saveTag, wallets, getWalletBalance, hideBalance, plan, transactions } = useFinwise()
  const { checkAccess, checkLimit } = useFeatureAccess()
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
  const [showMoreOptions, setShowMoreOptions] = useState(false)

  const valid = parseIDRInput(amount) > 0 && !isSubmitting

  const tagSuggestions = savedTags.filter(
    (t) => !selectedTags.includes(t) && t.includes(tagInput.toLowerCase().trim())
  )

  const currentMonthTx = transactions.filter(tx => tx.date.startsWith(new Date().toISOString().slice(0, 7)))
  const txLimit = checkLimit('transactions')

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

    if (typeof txLimit === 'number' && currentMonthTx.length >= txLimit) {
      alert(`⚠️ Batas transaksi bulan ini tercapai!\n\nKamu sudah mencapai batas ${txLimit} transaksi pada paket Basic.\n\nUpgrade ke Pro atau Premium untuk transaksi tak terbatas.`)
      return
    }

    setIsSubmitting(true)

    setTimeout(() => {
      addTransaction({
        type,
        category: type === 'income' ? 'income' : category,
        amount: parseIDRInput(amount),
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

  function setDateToday() {
    setDate(new Date().toISOString().slice(0, 10))
  }

  const isExpense = type === 'expense'

  return (
    <form onSubmit={submit} className="flex flex-col h-full">
      {/* Transaction Limit Indicator */}
      {plan === 'basic' && (
        <div className="mx-4 mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Transaksi: <strong className="text-foreground">{currentMonthTx.length}</strong>/{typeof txLimit === 'number' ? txLimit : '50'}
            </span>
            {typeof txLimit === 'number' && currentMonthTx.length >= txLimit && (
              <span className="text-amber-600 font-semibold">⚠️ Penuh</span>
            )}
          </div>
        </div>
      )}

      {/* ═══ Toggle Tipe Transaksi ═══ */}
      <div className="mx-4 mb-4 grid grid-cols-2 p-1 bg-muted/50 rounded-xl border border-border/50">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={cn(
            'py-2.5 text-sm font-semibold rounded-lg transition-all duration-200',
            isExpense
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          💸 Pengeluaran
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={cn(
            'py-2.5 text-sm font-semibold rounded-lg transition-all duration-200',
            !isExpense
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          💰 Pemasukan
        </button>
      </div>

      {/* ═══ Custom Keypad (Big Amount Display + Calculator) ═══ */}
      <CustomKeypad
        value={amount}
        onChange={setAmount}
        onConfirm={saveTransaction}
        onDateToday={setDateToday}
        type={type}
      />

      {/* ═══ Kategori Chips ═══ */}
      {isExpense && (
        <div className="px-4 mb-4">
          <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2 block">
            Pilih Kategori
          </label>
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
                    'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-[11px] transition-all duration-150 active:scale-95',
                    active
                      ? isExpense
                        ? 'border-rose-500 bg-rose-500/10 text-rose-400 font-medium scale-[1.02]'
                        : 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-medium scale-[1.02]'
                      : 'border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50'
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

      {/* ═══ Quick Description ═══ */}
      <div className="px-4 mb-3">
        <div className="relative flex items-center border-b-2 border-border focus-within:border-emerald-500 transition-colors duration-200 py-2">
          <input
            type="text"
            placeholder="Catatan (opsional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-foreground focus:outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* ═══ Wallet Selector (Top-Level) ═══ */}
      <div className="px-4 mb-3">
        <Label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1.5 block">
          {type === 'expense' ? '📦 Ambil dari Dompet' : '📦 Masuk ke Dompet'}
        </Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {wallets.map((w) => {
            const active = walletId === w.id
            const walletBalance = getWalletBalance(w.id)
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setWalletId(w.id)
                  if (type === 'expense') {
                    const hint = walletAutoCategory(w.id, description)
                    if (hint) setCategory(hint)
                  }
                }}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] transition-all duration-150 active:scale-95',
                  active
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                )}
              >
                <span className="text-base">
                  {w.logo || detectLogo(w.name)
                    ? <img src={w.logo || detectLogo(w.name)} alt="" className="w-5 h-5 object-contain" />
                    : w.icon
                  }
                </span>
                <span className="truncate font-medium">{w.name}</span>
                <span className={cn(
                  'text-[10px] font-bold tabular-nums',
                  walletBalance > 0 ? 'text-emerald-600 dark:text-emerald-400'
                    : walletBalance < 0 ? 'text-destructive'
                    : 'text-muted-foreground'
                )}>
                  {hideBalance ? '••••' : formatIDRShort(walletBalance)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ More Options (Collapsible) ═══ */}
      <div className="px-4">
        <button
          type="button"
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          {showMoreOptions ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          Opsi Lainnya
          {(selectedTags.length > 0 || location) && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </button>

        {showMoreOptions && (
          <div className="space-y-3 pb-2 animate-in slide-in-from-top-2 duration-200">
            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date" className="text-xs">📅 Tanggal</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Tag className="size-3" /> Tags <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <div className="relative">
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-background p-2 min-h-[36px] focus-within:border-primary transition-colors">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
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
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <LocationPicker value={location} onChange={setLocation} />
          </div>
        )}
      </div>

      {/* ═══ Sticky Submit Button ═══ */}
      <div className="mt-auto px-4 pt-4 pb-2 border-t border-border/50">
        <Button
          type="submit"
          disabled={!valid}
          className={cn(
            'w-full h-12 rounded-xl text-base font-bold tracking-wide transition-all duration-200',
            valid
              ? isExpense
                ? 'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-lg shadow-rose-900/20'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-emerald-900/20'
              : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
          )}
        >
          {isSubmitting ? (
            <span className="animate-pulse">⏳ Menyimpan...</span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Check className="size-5" />
              Simpan Transaksi
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}

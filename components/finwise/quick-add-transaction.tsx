'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { EXPENSE_CATEGORIES, formatIDRInput, parseIDRInput, type CategoryId, type TxType } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

/**
 * Compact inline transaction entry for the Home "Recent" card.
 * Lets users log an expense/income in one tap without opening the full sheet.
 */
export function QuickAddTransaction() {
  const { addTransaction, wallets } = useFinwise()
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [justSaved, setJustSaved] = useState(false)

  const numeric = parseIDRInput(amount)
  const valid = numeric > 0
  const isExpense = type === 'expense'
  const walletId = wallets[0]?.id || 'cash'

  function save() {
    if (!valid) return
    haptic.light()
    addTransaction({
      type,
      category: isExpense ? category : 'income',
      amount: numeric,
      description: isExpense ? '' : 'Pemasukan',
      date: new Date().toISOString().slice(0, 10),
      walletId,
    })
    setAmount('')
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1200)
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3 mb-3">
      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-1 mb-2 rounded-xl bg-background p-1">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={cn(
            'py-1.5 text-xs font-semibold rounded-lg transition-all',
            isExpense ? 'bg-rose-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          💸 Keluar
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={cn(
            'py-1.5 text-xs font-semibold rounded-lg transition-all',
            !isExpense ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          💰 Masuk
        </button>
      </div>

      {/* Amount + save */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex flex-1 items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary transition-colors">
          <span className="text-sm text-muted-foreground">Rp</span>
          <input
            inputMode="numeric"
            placeholder="0"
            value={formatIDRInput(amount)}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            className="w-full bg-transparent text-base font-bold text-foreground outline-none tabular-nums"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!valid}
          aria-label="Simpan transaksi"
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl transition active:scale-90',
            valid
              ? isExpense
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {justSaved ? <Check className="size-5" /> : <Plus className="size-5" />}
        </button>
      </div>

      {/* Category chips (expense only) */}
      {isExpense && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {EXPENSE_CATEGORIES.slice(0, 8).map((c) => {
            const Icon = c.icon
            const active = category === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition active:scale-95',
                  active
                    ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="size-3" />
                {c.label.split(' ')[0]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

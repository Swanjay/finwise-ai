'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { EXPENSE_CATEGORIES, formatIDRInput, parseIDRInput, walletAutoCategory, type CategoryId, type TxType } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

/**
 * Compact inline transaction entry for the Home "Recent" card.
 * Text-only wallets + category chips (no icons). Selecting a wallet auto-picks
 * its category via the same WALLET_CATEGORY_HINTS map the full sheet uses.
 */
export function QuickAddTransaction() {
  const { addTransaction, wallets } = useFinwise()
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<CategoryId>('food')
  const [walletId, setWalletId] = useState(wallets[0]?.id || 'cash')
  const [justSaved, setJustSaved] = useState(false)

  const numeric = parseIDRInput(amount)
  const valid = numeric > 0
  const isExpense = type === 'expense'

  function pickWallet(id: string) {
    setWalletId(id)
    if (isExpense) {
      const hint = walletAutoCategory(id, '')
      if (hint) setCategory(hint)
    }
  }

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
          Keluar
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={cn(
            'py-1.5 text-xs font-semibold rounded-lg transition-all',
            !isExpense ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Masuk
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

      {/* Wallet row (text-only, auto-picks category) */}
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Ambil dari Dompet
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-2">
        {wallets.map((w) => {
          const active = walletId === w.id
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => pickWallet(w.id)}
              className={cn(
                'shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition active:scale-95',
                active
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {w.name}
            </button>
          )
        })}
      </div>

      {/* Category chips (expense only, text-only) */}
      {isExpense && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {EXPENSE_CATEGORIES.map((c) => {
            const active = category === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition active:scale-95',
                  active
                    ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                )}
              >
                {c.label.split(' ')[0]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

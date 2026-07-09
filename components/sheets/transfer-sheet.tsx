'use client'

import { useState } from 'react'
import { ArrowDownUp, ArrowLeftRight } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { detectLogo } from '@/lib/brand-logos'
import { formatIDR, formatIDRInput, parseIDRInput } from '@/lib/finwise'
import { cn } from '@/lib/utils'

function TransferSheetContent({ onClose }: { onClose: () => void }) {
  const { wallets, addTransaction, getWalletBalance } = useFinwise()
  const [fromId, setFromId] = useState(wallets[0]?.id || '')
  const [toId, setToId] = useState(wallets[1]?.id || '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const valid = parseIDRInput(amount) > 0 && fromId && toId && fromId !== toId

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    
    try {
      const val = parseIDRInput(amount)
      const fromName = wallets.find(w => w.id === fromId)?.name || 'Dompet'
      const toName = wallets.find(w => w.id === toId)?.name || 'Dompet'
      const transferId = 'tr_' + Math.random().toString(36).substring(2, 11)
      // Create expense from source wallet
      addTransaction({
        type: 'expense',
        category: 'transfer',
        amount: val,
        description: note || `Transfer ke ${toName}`,
        date: new Date().toISOString().slice(0, 10),
        walletId: fromId,
        transferId,
      })
      // Create income to destination wallet
      addTransaction({
        type: 'income',
        category: 'transfer',
        amount: val,
        description: note || `Transfer dari ${fromName}`,
        date: new Date().toISOString().slice(0, 10),
        walletId: toId,
        transferId,
      })
      onClose()
    } catch (error) {
      console.error('[transfer] Submit failed:', error)
      alert('Gagal transfer antar dompet. Coba lagi.')
    }
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
                <span className="text-lg">{w.logo || detectLogo(w.name) ? <img src={w.logo || detectLogo(w.name)} alt="" className="w-6 h-6 object-contain dark:rounded-md dark:bg-white/20 dark:p-0.5" loading="lazy" /> : w.icon}</span>
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
                <span className="text-lg">{w.logo || detectLogo(w.name) ? <img src={w.logo || detectLogo(w.name)} alt="" className="w-6 h-6 object-contain dark:rounded-md dark:bg-white/20 dark:p-0.5" loading="lazy" /> : w.icon}</span>
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

export function TransferSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Transfer Antar Dompet" initialSnap={0.9}>
      <TransferSheetContent onClose={onClose} />
    </BottomSheet>
  )
}

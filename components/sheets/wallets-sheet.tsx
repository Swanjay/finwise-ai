'use client'

import { useState } from 'react'
import { Plus, Settings, Trash2, ArrowLeftRight } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { detectLogo } from '@/lib/brand-logos'
import {
  formatIDR,
  formatIDRInput,
  parseIDRInput,
  generateId,
  WALLET_ICON_OPTIONS,
  WALLET_COLOR_PRESETS,
  type Wallet as WalletType,
} from '@/lib/finwise'
import { cn } from '@/lib/utils'

function WalletsSheetContent({ onClose }: { onClose: () => void }) {
  const { wallets, addWallet, updateWallet, deleteWallet, getWalletBalance, getTotalBalance, transactions } = useFinwise()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💵')
  const [initBalance, setInitBalance] = useState('')
  const [walletColor, setWalletColor] = useState(WALLET_COLOR_PRESETS[0])
  const [walletType, setWalletType] = useState<'bank' | 'ewallet' | 'cash' | 'credit'>('cash')
  const [editingId, setEditingId] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    const balance = parseIDRInput(initBalance)
    const detectedLogo = detectLogo(name)
    if (editingId) {
      updateWallet(editingId, { name, icon, balance, color: walletColor, type: walletType, logo: detectedLogo })
      setEditingId(null)
    } else {
      addWallet({ id: generateId(), name, icon, balance, color: walletColor, type: walletType, logo: detectedLogo })
    }
    setName(''); setInitBalance(''); setIcon('💵'); setWalletColor(WALLET_COLOR_PRESETS[0]); setWalletType('cash'); setShowForm(false)
  }

  function startEdit(w: WalletType) {
    setName(w.name)
    setIcon(w.icon)
    setInitBalance(String(w.balance))
    setWalletColor(w.color)
    setWalletType(w.type || 'cash')
    setEditingId(w.id)
    setShowForm(true)
  }

  return (
    <div className="flex flex-col gap-4 ">
      {/* Total saldo */}
      <div className="rounded-xl bg-primary/10 p-3 text-center">
        <p className="text-xs text-muted-foreground">Total Saldo</p>
        <p className="text-xl font-bold text-primary">{formatIDR(getTotalBalance())}</p>
      </div>
      <div className="flex gap-2 self-end">
        <Button size="sm" variant="outline" onClick={() => { onClose(); setTimeout(() => { const ev = new CustomEvent('open-sheet', { detail: 'transfer' }); window.dispatchEvent(ev) }, 100) }} className="gap-1"><ArrowLeftRight className="size-4" /> Transfer</Button>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditingId(null); setName(''); setIcon('💵'); setInitBalance(''); }} className="gap-1"><Plus className="size-4" /> Baru</Button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Input placeholder="Nama dompet (e.g. GoPay)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input inputMode="numeric" placeholder="Saldo awal (Rp)" value={formatIDRInput(initBalance)} onChange={(e) => setInitBalance(e.target.value.replace(/\D/g, ''))} />

          {/* Wallet Type */}
          <div>
            <Label className="text-xs mb-1 block">Tipe Dompet</Label>
            <div className="grid grid-cols-4 gap-1">
              {(['cash', 'bank', 'ewallet', 'credit'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setWalletType(t)} className={cn('text-[10px] py-1.5 px-2 rounded-lg font-medium transition', walletType === t ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')}>
                  {t === 'cash' ? '💵 Cash' : t === 'bank' ? '🏦 Bank' : t === 'ewallet' ? '📱 E-Wallet' : '💳 Kredit'}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <Label className="text-xs mb-1 block">Ikon</Label>
            <div className="flex flex-wrap gap-1.5">
              {WALLET_ICON_OPTIONS.map((opt) => (
                <button key={opt.emoji} type="button" onClick={() => setIcon(opt.emoji)} className={cn('text-xl p-1.5 rounded-lg transition', icon === opt.emoji ? 'bg-primary/20 ring-2 ring-primary/40' : 'bg-secondary hover:bg-secondary/80')}>{opt.emoji}</button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <Label className="text-xs mb-1 block">Warna</Label>
            <div className="flex flex-wrap gap-1.5">
              {WALLET_COLOR_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => setWalletColor(c)} className={cn('size-7 rounded-full transition', walletColor === c ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110')} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowForm(false); setEditingId(null) }}>Batal</Button><Button type="submit" className="flex-1">{editingId ? 'Update' : 'Simpan'}</Button></div>
        </form>
      )}
      {wallets.map((w) => {
        const computed = getWalletBalance(w.id)
        const walletTx = transactions.filter(t => t.walletId === w.id)
        const txCount = walletTx.length
        return (
        <Card key={w.id} className="overflow-visible shadow-sm border-l-4" style={{ borderLeftColor: w.color }}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              {/* Sisi Kiri: Logo + Detail */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center justify-center size-10 rounded-xl text-lg shrink-0" style={{ backgroundColor: `${w.color}20`, color: w.color }}>
                  {w.logo || detectLogo(w.name) ? (
                    <img src={w.logo || detectLogo(w.name)} alt="" className="w-7 h-7 object-contain dark:rounded-md dark:bg-white/20 dark:p-0.5" />
                  ) : (
                    w.icon
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{w.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{txCount} transaksi · {w.type || 'cash'}</p>
                </div>
              </div>
              
              {/* Sisi Kanan: Saldo + Aksi */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right mr-1">
                  <p className="text-sm font-bold text-primary tabular-nums">{formatIDR(computed)}</p>
                </div>
                <div className="flex items-center gap-1 border-l pl-2 border-border">
                  <button onClick={() => startEdit(w)} aria-label={`Edit ${w.name}`} className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-muted transition-colors"><Settings className="size-4" /></button>
                  <button onClick={() => { if (window.confirm(`Hapus dompet "${w.name}"? Saldo akan hilang.`)) deleteWallet(w.id) }} aria-label={`Hapus dompet ${w.name}`} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-muted transition-colors"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )
      })}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

export function WalletsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Dompet & Rekening" initialSnap={0.9}>
      <WalletsSheetContent onClose={onClose} />
    </BottomSheet>
  )
}

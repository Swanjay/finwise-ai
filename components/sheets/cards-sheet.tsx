'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CreditCard, Plus, Pencil, Trash2, X, Check,
  ChevronLeft, Building2, Smartphone, Calendar, Hash,
  Link2, AlertCircle,
} from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { CardDisplay, CARD_GRADIENTS } from '@/components/finwise/card-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatIDR, formatIDRInput, parseIDRInput, generateId } from '@/lib/finwise'
import { cn } from '@/lib/utils'
import type { Card } from '@/lib/finwise'

type View = 'list' | 'add' | 'edit'

function CardsSheetContent({ onClose }: { onClose: () => void }) {
  const { cards, addCard, updateCard, deleteCard, getCardLimitUsage, wallets } = useFinwise()
  const [view, setView] = useState<View>('list')
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<Card['type']>('debit')
  const [lastFour, setLastFour] = useState('')
  const [expiry, setExpiry] = useState('')
  const [bank, setBank] = useState('')
  const [color, setColor] = useState<string>(CARD_GRADIENTS[0].id)
  const [limitStr, setLimitStr] = useState('')
  const [billingDay, setBillingDay] = useState('')
  const [linkedWalletId, setLinkedWalletId] = useState('')

  // Color selection
  const selectedGradient = CARD_GRADIENTS.find(g => g.id === color) || CARD_GRADIENTS[0]

  function resetForm() {
    setName('')
    setType('debit')
    setLastFour('')
    setExpiry('')
    setBank('')
    setColor(CARD_GRADIENTS[0].id)
    setLimitStr('')
    setBillingDay('')
    setLinkedWalletId('')
  }

  function openAddForm() {
    resetForm()
    setEditingCard(null)
    setView('add')
  }

  function openEditForm(card: Card) {
    setName(card.name)
    setType(card.type)
    setLastFour(card.lastFour)
    setExpiry(card.expiry)
    setBank(card.bank)
    setColor(card.color || CARD_GRADIENTS[0].id)
    setLimitStr(String(card.limit || ''))
    setBillingDay(String(card.billingDay || ''))
    setLinkedWalletId(card.linkedWalletId || '')
    setEditingCard(card)
    setView('edit')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !lastFour || !expiry || !bank) return

    const cardData: Card = {
      id: editingCard?.id || generateId(),
      name,
      type,
      lastFour: lastFour.slice(-4),
      expiry,
      bank,
      color: selectedGradient.gradient,
      limit: type === 'credit' ? parseIDRInput(limitStr) : undefined,
      billingDay: type === 'credit' ? Number(billingDay) || undefined : undefined,
      linkedWalletId: linkedWalletId || undefined,
    }

    if (editingCard) {
      updateCard(editingCard.id, cardData)
    } else {
      addCard(cardData)
    }
    setView('list')
    resetForm()
  }

  function handleDelete(cardId: string) {
    deleteCard(cardId)
    setDeleteConfirm(null)
  }

  function handleExpiryChange(val: string) {
    // Auto-format MM/YY
    const digits = val.replace(/\D/g, '')
    if (digits.length >= 2) {
      setExpiry(digits.slice(0, 2) + '/' + digits.slice(2, 4))
    } else {
      setExpiry(digits)
    }
  }

  // ─── List View ───
  if (view === 'list') {
    return (
      <div className="space-y-5">
        {/* Add Card Button */}
        <Button onClick={openAddForm} className="w-full gap-2 h-12 text-base">
          <Plus className="size-5" />
          Tambah Kartu
        </Button>

        {/* Card Grid */}
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CreditCard className="size-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">Belum ada kartu</p>
            <p className="text-xs text-center mt-1">Tambahkan kartu kredit, debit, atau e-wallet untuk melacak pengeluaranmu</p>
          </div>
        ) : (
          <div className="space-y-6">
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-3"
              >
                {/* Card Display */}
                <div className="flex justify-center">
                  <CardDisplay 
                    card={{ ...card, usedLimit: getCardLimitUsage(card.id) }}
                    className="w-full max-w-[340px]"
                  />
                </div>

                {/* Card Info & Actions */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    {card.linkedWalletId && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Link2 className="size-3" />
                        {wallets.find(w => w.id === card.linkedWalletId)?.name || 'Linked'}
                      </span>
                    )}
                    {card.type === 'credit' && card.billingDay && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Calendar className="size-3" />
                        Tgl {card.billingDay}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 rounded-full text-muted-foreground hover:text-primary"
                      onClick={() => openEditForm(card)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirm(card.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                <AnimatePresence>
                  {deleteConfirm === card.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                        <AlertCircle className="size-4 text-destructive shrink-0" />
                        <p className="text-xs text-destructive flex-1">Hapus kartu {card.name}?</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(null)}>
                            Batal
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(card.id)}>
                            Hapus
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Add/Edit Form ───
  const isEditing = view === 'edit'
  const previewCard: Card = {
    id: 'preview',
    name: name || 'Kartu Baru',
    type,
    lastFour: lastFour || '0000',
    expiry: expiry || 'MM/YY',
    bank: bank || 'Bank',
    color: selectedGradient.gradient,
    limit: type === 'credit' ? parseIDRInput(limitStr) : undefined,
    usedLimit: 0,
    billingDay: type === 'credit' ? Number(billingDay) : undefined,
    linkedWalletId: linkedWalletId || undefined,
  }

  return (
    <div className="space-y-5">
      {/* Back Button */}
      <button
        onClick={() => { setView('list'); resetForm() }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ChevronLeft className="size-4" />
        Kembali
      </button>

      {/* Preview */}
      <div className="flex justify-center -mx-5 py-4 bg-gradient-to-b from-muted/50 to-transparent">
        <motion.div
          key={color}
          initial={{ rotateY: 90 }}
          animate={{ rotateY: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <CardDisplay card={previewCard} showLimit={false} className="w-full max-w-[300px]" />
        </motion.div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card Type */}
        <div className="space-y-2">
          <Label>Tipe Kartu</Label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'debit' as const, label: 'Debit', icon: Building2 },
              { id: 'credit' as const, label: 'Kredit', icon: CreditCard },
              { id: 'e-wallet' as const, label: 'E-Wallet', icon: Smartphone },
            ]).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl p-3 border text-xs font-medium transition',
                  type === t.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <t.icon className="size-5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="card-name">Nama Kartu</Label>
          <Input
            id="card-name"
            placeholder="BCA Visa Platinum"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Bank */}
        <div className="space-y-2">
          <Label htmlFor="card-bank">Bank / Provider</Label>
          <Input
            id="card-bank"
            placeholder="BCA, Mandiri, GoPay..."
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            required
          />
        </div>

        {/* Last 4 Digits & Expiry */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="card-last-four">4 Digit Terakhir</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="card-last-four"
                inputMode="numeric"
                maxLength={4}
                placeholder="4521"
                value={lastFour}
                onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ''))}
                className="pl-9 tabular-nums"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-expiry">Masa Berlaku</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="card-expiry"
                placeholder="12/28"
                maxLength={5}
                value={expiry}
                onChange={(e) => handleExpiryChange(e.target.value)}
                className="pl-9 tabular-nums"
                required
              />
            </div>
          </div>
        </div>

        {/* Credit-only fields */}
        {type === 'credit' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4"
          >
            {/* Credit Limit */}
            <div className="space-y-2">
              <Label htmlFor="card-limit">Limit Kredit (Rp)</Label>
              <Input
                id="card-limit"
                inputMode="numeric"
                placeholder="10.000.000"
                value={formatIDRInput(limitStr)}
                onChange={(e) => setLimitStr(e.target.value.replace(/\D/g, ''))}
                className="tabular-nums"
              />
            </div>

            {/* Billing Day */}
            <div className="space-y-2">
              <Label htmlFor="card-billing">Tanggal Tagihan</Label>
              <Input
                id="card-billing"
                inputMode="numeric"
                min={1}
                max={28}
                placeholder="1-28"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value.replace(/\D/g, ''))}
                className="tabular-nums"
              />
              <p className="text-xs text-muted-foreground">Hari dalam bulan saat tagihan cetak (1-28)</p>
            </div>
          </motion.div>
        )}

        {/* Link to Wallet */}
        <div className="space-y-2">
          <Label>Hubungkan ke Dompet</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLinkedWalletId('')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium border transition',
                !linkedWalletId
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              Tidak Ada
            </button>
            {wallets.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => setLinkedWalletId(w.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium border transition',
                  linkedWalletId === w.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {w.icon} {w.name}
              </button>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <Label>Warna Kartu</Label>
          <div className="flex gap-3">
            {CARD_GRADIENTS.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setColor(g.id)}
                className={cn(
                  'relative size-10 rounded-xl bg-gradient-to-br transition-all',
                  g.gradient,
                  color === g.id ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                )}
                aria-label={g.name}
              >
                {color === g.id && (
                  <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow-lg" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => { setView('list'); resetForm() }}
          >
            Batal
          </Button>
          <Button type="submit" className="flex-1 gap-2">
            {isEditing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {isEditing ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function CardsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Kartu Saya" initialSnap={0.9}>
      <CardsSheetContent onClose={onClose} />
    </BottomSheet>
  )
}
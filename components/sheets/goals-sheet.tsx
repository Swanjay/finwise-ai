'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatIDR, formatIDRInput, parseIDRInput, generateId, COLOR_PRESETS } from '@/lib/finwise'

function GoalsSheetContent({ onClose }: { onClose: () => void }) {
  const { goals, addGoal, deleteGoal, addToGoal } = useFinwise()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || parseIDRInput(target) <= 0) return
    addGoal({ id: generateId(), name, targetAmount: parseIDRInput(target), currentAmount: 0, deadline: deadline || '2026-12-31', icon: '🎯', color: COLOR_PRESETS[goals.length % COLOR_PRESETS.length] })
    setName(''); setTarget(''); setDeadline(''); setShowForm(false)
  }

  return (
    <div className="flex flex-col gap-4 ">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 self-end"><Plus className="size-4" /> Baru</Button>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Input placeholder="Nama target (e.g. Laptop baru)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input inputMode="numeric" placeholder="Target nominal (Rp)" value={formatIDRInput(target)} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} />
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button><Button type="submit" className="flex-1">Simpan</Button></div>
        </form>
      )}
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Belum ada target tabungan 🎯</p>
      ) : goals.map((g) => {
        const pct = g.targetAmount > 0 ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100) : 0
        return (
          <Card key={g.id}>
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{g.icon} {g.name}</span>
                <button onClick={() => { if (window.confirm(`Hapus target "${g.name}"?`)) deleteGoal(g.id) }} aria-label={`Hapus target ${g.name}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatIDR(g.currentAmount)} / {formatIDR(g.targetAmount)}</span>
                <span>{pct}%</span>
              </div>
              <div className="flex gap-2 mt-1">
                <Input inputMode="numeric" placeholder="Tambah (Rp)" className="h-7 text-xs" id={`goal-${g.id}`} />
                <Button size="sm" className="h-7 text-xs" onClick={() => {
                  const el = document.getElementById(`goal-${g.id}`) as HTMLInputElement
                  const v = Number(el?.value?.replace(/\D/g, '')) || 0
                  if (v > 0) { addToGoal(g.id, v); if (el) el.value = '' }
                }}>+Tambah</Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

export function GoalsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Target Tabungan" initialSnap={0.9}>
      <GoalsSheetContent onClose={onClose} />
    </BottomSheet>
  )
}

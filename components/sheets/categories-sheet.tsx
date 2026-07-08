'use client'

import { useState } from 'react'
import { Plus, Trash2, ReceiptText } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { COLOR_PRESETS, type TxType } from '@/lib/finwise'
import { cn } from '@/lib/utils'

function CategoriesSheetContent({ onClose }: { onClose: () => void }) {
  const { allCategories, addCustomCategory, deleteCustomCategory } = useFinwise()
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<TxType>('expense')
  const [color, setColor] = useState(COLOR_PRESETS[0])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label) return
    const id = label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
    addCustomCategory({ id, label, icon: ReceiptText, color, type })
    setLabel(''); setShowForm(false)
  }

  const customCats = Object.values(allCategories).filter((c) => c.isCustom)

  return (
    <div className="flex flex-col gap-4 ">
      <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1 self-end"><Plus className="size-4" /> Kategori Baru</Button>
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30">
          <Input placeholder="Nama kategori" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="expense">Pengeluaran</TabsTrigger><TabsTrigger value="income">Pemasukan</TabsTrigger></TabsList>
          </Tabs>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_PRESETS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Pilih warna ${c}`} className={cn('size-6 rounded-full', color === c && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Batal</Button><Button type="submit" className="flex-1">Simpan</Button></div>
        </form>
      )}
      {customCats.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Belum ada kategori custom</p>
      ) : customCats.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg">
            <div className="size-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `color-mix(in oklch, ${c.color} 22%, transparent)` }}><Icon className="size-4" style={{ color: c.color }} /></div>
            <span className="flex-1 text-sm">{c.label}</span>
            <span className="text-xs text-muted-foreground">{c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
            <button onClick={() => { if (window.confirm(`Hapus kategori "${c.label}"?`)) deleteCustomCategory(c.id) }} aria-label={`Hapus kategori ${c.label}`} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
          </div>
        )
      })}
      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

export function CategoriesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Kategori Custom">
      <CategoriesSheetContent onClose={onClose} />
    </BottomSheet>
  )
}

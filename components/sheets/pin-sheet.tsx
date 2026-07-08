'use client'

import { useState } from 'react'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

function PinSheetContent({ onClose }: { onClose: () => void }) {
  const { pin, setPin } = useFinwise()
  const [newPin, setNewPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  async function handleSave() {
    if (newPin.length < 4) { setError('PIN minimal 4 digit'); return }
    if (newPin !== confirm) { setError('PIN tidak cocok'); return }
    await setPin(newPin); onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      {pin && (
        <div className="p-3 rounded-xl bg-secondary text-sm">
          <p>PIN aktif: ••••</p>
          <Button size="sm" variant="destructive" className="mt-2" onClick={() => { setPin(null); onClose() }}>Nonaktifkan PIN</Button>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Label>{pin ? 'Ubah PIN' : 'Buat PIN Baru'}</Label>
        <Input type="password" inputMode="numeric" maxLength={6} placeholder="PIN baru" value={newPin} onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, '')); setError('') }} />
        <Input type="password" inputMode="numeric" maxLength={6} placeholder="Konfirmasi PIN" value={confirm} onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, '')); setError('') }} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={onClose}>Batal</Button><Button className="flex-1" onClick={handleSave}>Simpan</Button></div>
    </div>
  )
}

export function PinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Pengaman PIN">
      <PinSheetContent onClose={onClose} />
    </BottomSheet>
  )
}

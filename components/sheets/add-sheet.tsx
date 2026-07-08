'use client'

import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { AddTransactionForm } from '@/components/finwise/add-transaction-form'

export function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Catat Transaksi" initialSnap={0.9}>
      <AddTransactionForm onDone={onClose} />
    </BottomSheet>
  )
}

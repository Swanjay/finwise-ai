'use client'

import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { VoucherSheet } from '@/components/finwise/voucher-sheet'

export function VoucherSheetWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="🎫 Tukar Voucher">
      <VoucherSheet onClose={onClose} />
    </BottomSheet>
  )
}

'use client'

import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { SplitBillSheet } from '@/components/finwise/split-bill'

export function SplitBillSheetWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="👥 Split Bill">
      <SplitBillSheet onClose={onClose} />
    </BottomSheet>
  )
}

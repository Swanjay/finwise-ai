'use client'

import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { ScanFlow } from '@/components/finwise/scan-flow'

export function ScanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Scan Struk" initialSnap={0.9}>
      <ScanFlow onDone={onClose} />
    </BottomSheet>
  )
}

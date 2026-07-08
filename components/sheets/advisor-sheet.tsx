'use client'

import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { AdvisorChat } from '@/components/finwise/advisor-chat'

export function AdvisorSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="AI Advisor" initialSnap={0.9}>
      <AdvisorChat />
    </BottomSheet>
  )
}

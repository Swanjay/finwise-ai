'use client'

import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { SmartBudgetSheet } from '@/components/finwise/smart-budget'

export function SmartBudgetSheetWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="🤖 Smart Budget">
      <SmartBudgetSheet onClose={onClose} />
    </BottomSheet>
  )
}

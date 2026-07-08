'use client'

import dynamic from 'next/dynamic'
import { BottomSheet } from '@/components/finwise/bottom-sheet'

const ExportSheetComponent = dynamic(() => import('@/components/finwise/export-sheet').then(m => m.ExportSheet), { ssr: false })

export function ExportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Export & Backup">
      <ExportSheetComponent onClose={onClose} />
    </BottomSheet>
  )
}

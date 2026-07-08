'use client'

import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { NotificationCenter } from '@/components/finwise/smart-notifications'

export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="🔔 Notifikasi">
      <NotificationCenter onClose={onClose} />
    </BottomSheet>
  )
}

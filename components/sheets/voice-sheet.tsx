'use client'

import dynamic from 'next/dynamic'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'

const VoiceInput = dynamic(() => import('@/components/voice-input'), { ssr: false })

export function VoiceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wallets, addTransaction } = useFinwise()

  return (
    <BottomSheet open={open} onClose={onClose} title="🎤 Voice Input">
      <VoiceInput
        wallets={wallets}
        onResult={(parsed) => {
          addTransaction({
            type: parsed.type,
            category: parsed.category,
            amount: parsed.amount,
            description: parsed.note,
            date: new Date().toISOString().slice(0, 10),
            walletId: parsed.walletId,
          })
          onClose()
        }}
      />
    </BottomSheet>
  )
}

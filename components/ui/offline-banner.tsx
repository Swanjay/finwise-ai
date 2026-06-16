'use client'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus()

  if (isOnline && !wasOffline) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 p-2 text-center text-sm font-medium transition-all ${
      isOnline 
        ? 'bg-green-500/90 text-white' 
        : 'bg-red-500/90 text-white'
    }`}>
      {isOnline ? (
        <span>✅ Kembali online! Data sedang di-sync...</span>
      ) : (
        <span>📡 Anda sedang offline. Data akan disimpan lokal.</span>
      )}
    </div>
  )
}

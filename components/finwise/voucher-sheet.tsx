'use client'

import { useState } from 'react'
import { Ticket, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFinwise } from '@/components/finwise-store'
import { cn } from '@/lib/utils'

export function VoucherSheet({ onClose }: { onClose: () => void }) {
  const { plan, upgradePlan } = useFinwise()
  const [voucherCode, setVoucherCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)

  async function handleRedeem() {
    if (!voucherCode.trim()) return
    setRedeeming(true)
    setResult(null)

    try {
      const res = await fetch('/api/voucher/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode.trim().toUpperCase() }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setResult({ success: true, message: data.message })
        upgradePlan(data.plan_tier)
        setTimeout(() => onClose(), 2000)
      } else {
        setResult({ success: false, message: data.error || 'Gagal mengaktifkan voucher' })
      }
    } catch {
      setResult({ success: false, message: 'Koneksi gagal. Periksa internet kamu.' })
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Plan */}
      <div className={cn(
        'rounded-xl border p-4 text-center',
        plan === 'basic' ? 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900' :
        plan === 'pro' ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' :
        'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
      )}>
        <p className="text-xs text-muted-foreground mb-1">Paket Kamu Saat Ini</p>
        <p className={cn(
          'text-2xl font-bold',
          plan === 'basic' ? 'text-zinc-700 dark:text-zinc-300' :
          plan === 'pro' ? 'text-blue-700 dark:text-blue-300' :
          'text-amber-700 dark:text-amber-300'
        )}>
          {plan === 'basic' ? '🆓 Basic' : plan === 'pro' ? '💎 Pro' : '👑 Premium'}
        </p>
      </div>

      {/* Result Message */}
      {result && (
        <div className={cn(
          'rounded-lg border p-3 flex items-start gap-2 text-sm',
          result.success
            ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300'
            : 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300'
        )}>
          {result.success ? <CheckCircle className="size-4 mt-0.5 shrink-0" /> : <AlertCircle className="size-4 mt-0.5 shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}

      {/* Voucher Input */}
      <div className="space-y-2">
        <Label htmlFor="voucher">Masukkan Kode Voucher</Label>
        <div className="flex gap-2">
          <Input
            id="voucher"
            type="text"
            placeholder="CONTOH-VOUCHER"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
            disabled={redeeming}
            className="font-mono"
          />
          <Button onClick={handleRedeem} disabled={redeeming || !voucherCode.trim()} className="shrink-0">
            {redeeming ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Voucher bisa digunakan untuk upgrade ke paket Pro atau Premium.
        </p>
      </div>

      {/* How to Get Voucher */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Cara Mendapatkan Voucher:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-1">
          <li>Beli paket berlangganan di halaman Pricing</li>
          <li>Dapat dari promo atau event khusus</li>
          <li>Kode referral dari teman</li>
        </ul>
      </div>
    </div>
  )
}

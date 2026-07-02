'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Check, X, Ticket, Sparkles } from 'lucide-react'
import type { PlanTier } from '@/lib/plans'

const PLANS = [
  {
    tier: 'basic' as PlanTier,
    name: '🆓 Basic',
    price: 'Gratis',
    priceNote: 'Selamanya',
    color: 'zinc',
    features: [
      { label: '50 transaksi/bulan', included: true, limited: true },
      { label: '1 dompet', included: true, limited: true },
      { label: '5 kategori custom', included: true, limited: true },
      { label: 'Budgeting', included: false },
      { label: 'Target tabungan', included: false },
      { label: 'Laporan & grafik', included: false },
      { label: 'Export CSV', included: false },
      { label: 'Export PDF', included: false },
      { label: 'AI Advisor', included: false },
      { label: 'Scan struk AI', included: false },
      { label: 'Household sharing', included: false },
      { label: 'Split bill', included: false },
    ],
  },
  {
    tier: 'pro' as PlanTier,
    name: '💎 Pro',
    price: 'Rp 10.000',
    priceNote: '/bulan',
    color: 'blue',
    popular: true,
    features: [
      { label: 'Transaksi unlimited', included: true },
      { label: 'Dompet unlimited', included: true },
      { label: 'Kategori unlimited', included: true },
      { label: 'Budgeting', included: true },
      { label: 'Target tabungan', included: true },
      { label: 'Laporan & grafik', included: true },
      { label: 'Export CSV', included: true },
      { label: 'Export PDF', included: false },
      { label: 'AI Advisor', included: false },
      { label: 'Scan struk AI', included: false },
      { label: 'Household sharing', included: false },
      { label: 'Split bill', included: false },
    ],
  },
  {
    tier: 'premium' as PlanTier,
    name: '👑 Premium',
    price: 'Rp 20.000',
    priceNote: '/bulan',
    color: 'amber',
    features: [
      { label: 'Semua fitur Pro', included: true },
      { label: 'Export PDF', included: true },
      { label: 'AI Financial Advisor', included: true },
      { label: 'Scan struk AI', included: true },
      { label: 'Household sharing', included: true },
      { label: 'Split bill', included: true },
      { label: 'Prioritas support', included: true },
      { label: 'Early access fitur baru', included: true },
    ],
  },
]

export function PricingTableFooter({ currentPlan, onUpgrade }: { currentPlan: PlanTier; onUpgrade: () => void }) {
  return (
    <div className="mt-6 mb-4">
      <div className="text-center mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">Bandingkan Paket</h3>
        <p className="text-xs text-muted-foreground">Upgrade untuk akses fitur lebih lengkap</p>
      </div>

      <div className="space-y-3">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.tier
          const isHigher = PLANS.findIndex(x => x.tier === currentPlan) < PLANS.findIndex(x => x.tier === p.tier)
          return (
            <div key={p.tier} className={cn(
              'rounded-xl border-2 p-4 transition',
              isCurrent
                ? p.color === 'zinc' ? 'border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/50'
                : p.color === 'blue' ? 'border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                : 'border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
                : 'border-border bg-card',
              p.popular && !isCurrent && 'border-blue-300 dark:border-blue-700',
            )}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-base font-bold">{p.name}</span>
                  {p.popular && <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">POPULER</span>}
                </div>
                <div className="text-right">
                  <span className="text-base font-bold">{p.price}</span>
                  <span className="text-xs text-muted-foreground">{p.priceNote}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1.5">
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {f.included
                      ? <Check className={cn('size-3.5 shrink-0', 'limited' in f && f.limited ? 'text-amber-500' : 'text-primary')} />
                      : <X className="size-3.5 shrink-0 text-muted-foreground/40" />
                    }
                    <span className={cn(
                      f.included ? 'text-foreground' : 'text-muted-foreground',
                      'limited' in f && f.limited && 'text-amber-600 dark:text-amber-400',
                    )}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="mt-3">
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
                    <Check className="size-4" /> Paket aktif
                  </div>
                ) : isHigher ? (
                  <Button onClick={onUpgrade} className="w-full gap-2 text-xs h-9">
                    <Ticket className="size-3.5" /> Upgrade dengan Voucher
                  </Button>
                ) : (
                  <div className="text-center text-xs text-muted-foreground">
                    Paket di bawah yang aktif
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

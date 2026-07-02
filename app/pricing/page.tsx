'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Sparkles, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PLANS, type PlanTier, type PlanWithFeatures, type FeatureWithIncluded, savePlan, loadPlan } from '@/lib/plans'

function PricingCard({ plan, isCurrent, onSelect }: {
  plan: PlanWithFeatures
  isCurrent: boolean
  onSelect: (id: PlanTier) => void
}) {
  const features = plan.features as FeatureWithIncluded[]
  const isPopular = plan.id === 'pro'
  const isPremium = plan.id === 'premium'

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300',
      isCurrent && 'ring-2 ring-primary shadow-lg shadow-primary/20',
      !isCurrent && 'hover:shadow-md hover:-translate-y-0.5',
    )}>
      {isPopular && (
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
            POPULER
          </div>
        </div>
      )}
      <CardContent className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="text-center">
          <span className="text-2xl">{plan.badge}</span>
          <h3 className="font-heading text-lg font-bold mt-1">{plan.name}</h3>
          <div className="mt-2">
            {plan.price === 0 ? (
              <span className="text-2xl font-bold">Gratis</span>
            ) : (
              <>
                <span className="text-2xl font-bold">{plan.price.toLocaleString('id-ID')}</span>
                <span className="text-xs text-muted-foreground ml-1">/bln</span>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {plan.description && (
          <div className="text-center text-xs text-muted-foreground px-2 py-2 rounded-lg bg-secondary/50 border border-border">
            💡 {plan.description}
          </div>
        )}

        {/* Features */}
        <div className="flex flex-col gap-1.5">
          {features.map((f: FeatureWithIncluded) => (
            <div key={f.key} className="flex items-center gap-2 text-xs">
              {f.included ? (
                <>
                  <Check className="size-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground/80">
                    {f.label}{' '}
                    {typeof f.free === 'number' && plan.id === 'basic' && (
                      <span className="text-muted-foreground">({f.free}×)</span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="size-3.5 shrink-0 text-muted-foreground/30">—</span>
                  <span className="text-muted-foreground/40">{f.label}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={() => onSelect(plan.id)}
          variant={isCurrent ? 'outline' : isPremium ? 'default' : 'secondary'}
          className={cn(
            'w-full mt-1',
            isCurrent && 'border-primary/50 text-primary',
          )}
        >
          {isCurrent ? '✓ Paket Saat Ini' : plan.price === 0 ? 'Pilih Gratis' : `Pilih ${plan.name}`}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Upgrade Modal Component ───
export function UpgradeModal({ featureKey, onClose }: { featureKey: string; onClose: () => void }) {
  const { getUpgradeMessage } = require('@/lib/plans')

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
        <div className="text-3xl">🔒</div>
        <h2 className="font-heading text-lg font-bold">Fitur Premium</h2>
        <p className="text-sm text-muted-foreground">
          {getUpgradeMessage(featureKey)}
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/pricing">
            <Button className="w-full gap-2">
              <Sparkles className="size-4" /> Lihat Paket Harga
            </Button>
          </Link>
          <Button variant="ghost" onClick={onClose}>Nanti Saja</Button>
        </div>
      </div>
    </div>
  )
}

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanTier>(loadPlan())
  const [animating, setAnimating] = useState<PlanTier | null>(null)
  const [showConfirm, setShowConfirm] = useState<PlanTier | null>(null)

  async function handleSelect(planId: PlanTier) {
    if (planId === currentPlan) return

    if (planId === 'basic') {
      // Confirm before downgrading
      setShowConfirm('basic')
      return
    }

    // Pro/Premium — initiate payment
    setAnimating(planId)
    
    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan_tier: planId,
          payment_method: 'midtrans' // or whatever payment gateway
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed')
      }
      
      // Redirect to payment processor
      window.location.href = data.redirect_url
    } catch (error) {
      console.error('Payment error:', error)
      setAnimating(null)
      alert('Gagal memproses pembayaran: ' + (error as Error).message)
    }
  }

  function confirmDowngrade() {
    const planId = 'basic'
    setAnimating(planId)
    setTimeout(() => {
      savePlan(planId)
      setCurrentPlan(planId)
      setAnimating(null)
      setShowConfirm(null)
    }, 800)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-accent" /> FinWise AI
            </p>
            <h1 className="font-heading text-xl font-bold">Paket Harga</h1>
          </div>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {currentPlan === 'basic' ? '🆓 Basic' : currentPlan === 'pro' ? '💎 Pro' : '👑 Premium'}
        </span>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-muted-foreground mb-6">
        Pilih paket yang sesuai dengan kebutuhan keuangan kamu.
      </p>

      {/* Plans Grid */}
      <div className="flex flex-col gap-3">
        {PLANS.map((plan) => (
          <div key={plan.id} className={cn(
            'transition-all duration-300',
            animating === plan.id && 'opacity-50 scale-95',
          )}>
            <PricingCard
              plan={plan}
              isCurrent={currentPlan === plan.id}
              onSelect={handleSelect}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          🔒 Pembayaran aman via Midtrans (coming soon)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Semua paket dapat diubah kapan saja
        </p>
      </div>

      {/* Downgrade Confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <div className="text-3xl">⚠️</div>
            <h2 className="font-heading text-lg font-bold">Turun ke Basic?</h2>
            <p className="text-sm text-muted-foreground">
              Kamu akan kehilangan akses ke fitur premium seperti:
            </p>
            <ul className="text-xs text-left space-y-1 text-muted-foreground">
              <li className="flex items-center gap-1.5">❌ Budget & target tabungan</li>
              <li className="flex items-center gap-1.5">❌ Laporan grafik</li>
              <li className="flex items-center gap-1.5">❌ Transaksi tak terbatas</li>
              <li className="flex items-center gap-1.5">❌ Multi-wallet & lainnya</li>
            </ul>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(null)}>
                Batal
              </Button>
              <Button variant="destructive" className="flex-1" onClick={confirmDowngrade}>
                Ya, Turunkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation */}
      {animating && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-4xl animate-bounce">
              {animating === 'pro' ? '💎' : '👑'}
            </div>
            <p className="text-white font-bold text-lg">
              {animating === 'pro' ? 'Pro' : 'Premium'} Aktif!
            </p>
            <p className="text-white/60 text-sm">Nikmati semua fitur eksklusif</p>
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useFinwise } from '@/components/finwise-store'
import { canAccess, getFeatureLimit, type PlanTier } from '@/lib/plans'
import { Sparkles, Lock } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'

interface FeatureGateProps {
  featureKey: string
  children: ReactNode
  fallback?: ReactNode
  /** Show upgrade badge instead of hiding content */
  showBadge?: boolean
  /** Show upgrade modal on click */
  onUpgradeRequest?: (featureKey: string) => void
}

interface FeatureLimitProps {
  featureKey: string
  currentCount: number
  children: ReactNode
  fallback?: ReactNode
}

// ─── Feature Gate: Blocks access to premium features ───
export function FeatureGate({ featureKey, children, fallback, showBadge = false, onUpgradeRequest }: FeatureGateProps) {
  const { plan } = useFinwise()
  const hasAccess = canAccess(plan, featureKey)

  if (hasAccess) return <>{children}</>

  if (showBadge) {
    return (
      <div className="relative group">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg">
          <button
            onClick={() => onUpgradeRequest?.(featureKey)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-lg transition-all hover:scale-105"
          >
            <Lock className="size-3" /> Upgrade
          </button>
        </div>
      </div>
    )
  }

  if (fallback) return <>{fallback}</>

  return (
    <button
      onClick={() => onUpgradeRequest?.(featureKey)}
      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-sm text-muted-foreground transition-all hover:bg-primary/10 hover:border-primary/50"
    >
      <Lock className="size-4 text-primary" />
      <span>Fitur Premium — <span className="text-primary font-semibold">Upgrade Sekarang</span></span>
      <Sparkles className="size-4 text-primary" />
    </button>
  )
}

// ─── Feature Limit: Checks quota (e.g., 50 transactions on Basic) ───
export function FeatureLimit({ featureKey, currentCount, children, fallback }: FeatureLimitProps) {
  const { plan } = useFinwise()
  const limit = getFeatureLimit(plan, featureKey)

  if (limit === true) return <>{children}</>
  if (limit === false) {
    return fallback ? <>{fallback}</> : (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold text-foreground">Fitur Tidak Tersedia</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upgrade ke Pro atau Premium untuk mengakses fitur ini
          </p>
        </div>
        <Link href="/pricing" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white">
          Lihat Paket Harga
        </Link>
      </div>
    )
  }

  // Numeric limit
  if (typeof limit === 'number') {
    if (currentCount < limit) return <>{children}</>
    return fallback ? <>{fallback}</> : (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
        <div className="text-2xl">⚠️</div>
        <div>
          <p className="text-sm font-semibold text-foreground">Batas Tercapai</p>
          <p className="text-xs text-muted-foreground mt-1">
            Kamu sudah mencapai batas {limit} pada paket Basic. Upgrade untuk akses tak terbatas.
          </p>
        </div>
        <Link href="/pricing" className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white">
          Upgrade ke Pro
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
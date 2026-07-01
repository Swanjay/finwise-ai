// ─── FinWise Plan System ───
// localStorage-based for prototype | Payment integration TBD

export type PlanTier = 'basic' | 'pro' | 'premium'

export interface PlanDef {
  id: PlanTier
  name: string
  label: string
  price: number // IDR/month
  badge: string // emoji badge
  color: string // tailwind class
  features: FeatureDef[]
}

export interface FeatureDef {
  key: string
  label: string
  free?: boolean | number  // true = unlimited, number = count limit
  pro?: boolean | number
  premium?: boolean | number
}

// ─── Feature limits per tier ───
export const FEATURES: FeatureDef[] = [
  { key: 'transactions', label: 'Transaksi/bulan', free: 50, pro: true, premium: true },
  { key: 'wallets', label: 'Dompet (Wallet)', free: 1, pro: true, premium: true },
  { key: 'custom_categories', label: 'Kategori Custom', free: 5, pro: true, premium: true },
  { key: 'budgets', label: 'Budget per kategori', free: false, pro: true, premium: true },
  { key: 'recurring', label: 'Transaksi Berulang', free: false, pro: true, premium: true },
  { key: 'goals', label: 'Target Tabungan', free: false, pro: true, premium: true },
  { key: 'reports_charts', label: 'Laporan Grafik', free: false, pro: true, premium: true },
  { key: 'export_csv', label: 'Export CSV', free: false, pro: true, premium: true },
  { key: 'export_pdf', label: 'Export PDF', free: false, pro: false, premium: true },
  { key: 'ai_advisor', label: 'AI Advisor', free: false, pro: false, premium: true },
  { key: 'ai_scan', label: 'Scan Struk AI', free: false, pro: false, premium: true },
  { key: 'household', label: 'Household (shared)', free: false, pro: false, premium: true },
  { key: 'split_bill', label: 'Split Bill', free: false, pro: false, premium: true },
  { key: 'tags', label: 'Tags/Label', free: false, pro: true, premium: true },
  { key: 'notifications', label: 'Notifikasi Pintar', free: false, pro: true, premium: true },
  { key: 'gamification', label: 'Gamification', free: true, pro: true, premium: true },
]

// ─── Plan definitions for pricing page ───
export const PLANS: (PlanDef & { features: FeatureWithIncluded[] })[] = [
  {
    id: 'basic',
    name: 'Basic',
    label: 'Gratis',
    price: 0,
    badge: '🆓',
    color: 'from-zinc-500 to-zinc-400',
    features: FEATURES.map(f => ({ ...f, included: f.free !== false })),
  },
  {
    id: 'pro',
    name: 'Pro',
    label: 'Rp 10.000/bulan',
    price: 10000,
    badge: '💎',
    color: 'from-blue-500 to-cyan-400',
    features: FEATURES.map(f => ({ ...f, included: f.pro !== false })),
  },
  {
    id: 'premium',
    name: 'Premium',
    label: 'Rp 20.000/bulan',
    price: 20000,
    badge: '👑',
    color: 'from-amber-500 to-orange-400',
    features: FEATURES.map(f => ({ ...f, included: true })),
  },
]

// ─── Type for pricing card features (with included flag) ───
export interface FeatureWithIncluded extends FeatureDef {
  included: boolean
}

export type PlanWithFeatures = PlanDef & { features: FeatureWithIncluded[] }

// ─── Get limit value for a feature given a plan ───
export function getFeatureLimit(plan: PlanTier, featureKey: string): boolean | number | null {
  const feature = FEATURES.find(f => f.key === featureKey)
  if (!feature) return null

  const val: boolean | number | undefined = plan === 'basic' ? feature.free : plan === 'pro' ? feature.pro : feature.premium
  return val ?? null
}

// ─── Check if a feature is available ───
export function canAccess(plan: PlanTier, featureKey: string): boolean {
  const limit = getFeatureLimit(plan, featureKey)
  if (limit === true) return true       // unlimited access
  if (limit === false) return false     // no access at all
  if (typeof limit === 'number') return limit > 0 // has some limit (checks done separately for count)
  return false
}

// ─── Check if user has remaining quota ───
export function hasQuota(plan: PlanTier, featureKey: string, currentCount: number): boolean {
  const limit = getFeatureLimit(plan, featureKey)
  if (limit === true) return true
  if (limit === false) return false
  if (typeof limit === 'number') return currentCount < limit
  return false
}

// ─── Get user-friendly feature block message ───
export function getUpgradeMessage(featureKey: string): string {
  const names: Record<string, string> = {
    budgets: 'Budget per kategori',
    recurring: 'Transaksi berulang',
    goals: 'Target tabungan',
    reports_charts: 'Laporan grafik',
    export_csv: 'Export CSV',
    export_pdf: 'Export PDF',
    ai_advisor: 'AI Advisor',
    ai_scan: 'Scan struk AI',
    household: 'Household',
    split_bill: 'Split Bill',
    tags: 'Tags',
    notifications: 'Notifikasi',
    wallets: 'Dompet tambahan',
    custom_categories: 'Kategori custom tambahan',
  }
  return `Fitur ${names[featureKey] || featureKey} hanya tersedia di **Pro** atau **Premium**.`
}

// ─── Storage key ───
const PLAN_KEY = 'fw.plan.v1'

export function loadPlan(): PlanTier {
  if (typeof window === 'undefined') return 'basic'
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (raw === 'pro' || raw === 'premium') return raw
  } catch { /* */ }
  return 'basic'
}

export function savePlan(plan: PlanTier) {
  try { localStorage.setItem(PLAN_KEY, plan) } catch { /* */ }
}
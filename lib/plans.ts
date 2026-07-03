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
  description?: string // Optional feature description
  features: FeatureDef[]
}

export interface FeatureDef {
  key: string
  label: string
  free?: boolean | number  // true = unlimited, number = count limit
  pro?: boolean | number
  premium?: boolean | number
}

// ─── Feature definitions per tier ───
export const FEATURES: FeatureDef[] = [
  { key: 'transactions', label: 'Transaksi Bulanan', free: 50, pro: true, premium: true },
  { key: 'wallets', label: 'Dompet & Rekening', free: 1, pro: true, premium: true },
  { key: 'custom_categories', label: 'Kategori Custom', free: 5, pro: true, premium: true },
  { key: 'budgets', label: 'Budgeting Per Kategori', free: false, pro: true, premium: true },
  { key: 'recurring', label: 'Transaksi Berulang Otomatis', free: false, pro: true, premium: true },
  { key: 'goals', label: 'Target Tabungan Cerdas', free: false, pro: true, premium: true },
  { key: 'reports_charts', label: 'Laporan & Grafik Visual', free: false, pro: true, premium: true },
  { key: 'export_csv', label: 'Export Data (CSV)', free: false, pro: true, premium: true },
  { key: 'export_pdf', label: 'Export Laporan PDF', free: false, pro: false, premium: true },
  { key: 'ai_advisor', label: 'AI Financial Advisor', free: false, pro: false, premium: true },
  { key: 'ai_scan', label: 'Scan Struk AI (OCR)', free: false, pro: false, premium: true },
  { key: 'voice_input', label: 'Catat Transaksi Suara (AI)', free: false, pro: false, premium: true },
  { key: 'household', label: 'Household Sharing', free: false, pro: false, premium: true },
  { key: 'split_bill', label: 'Split Bill Bersama', free: false, pro: false, premium: true },
  { key: 'tags', label: 'Tags & Labeling', free: false, pro: true, premium: true },
  { key: 'notifications', label: 'Notifikasi Pintar', free: false, pro: true, premium: true },
  { key: 'gamification', label: 'Gamification & Badges', free: true, pro: true, premium: true },
]

// ─── Plan definitions for pricing page ───
export const PLANS: (PlanDef & { features: FeatureWithIncluded[]; description?: string })[] = [
  {
    id: 'basic',
    name: 'Basic',
    label: 'Gratis',
    price: 0,
    badge: '🆓',
    color: 'from-zinc-500 to-zinc-400',
    description: 'Perfect untuk mulai kelola keuangan pribadi dengan fitur dasar yang esensial.',
    features: FEATURES.map(f => ({ ...f, included: f.free !== false })),
  },
  {
    id: 'pro',
    name: 'Pro',
    label: 'Rp 10.000/bulan',
    price: 10000,
    badge: '💎',
    color: 'from-blue-500 to-cyan-400',
    description: 'Upgrade ke unlimited transaksi, budgeting, laporan visual, dan tools produktivitas lengkap.',
    features: FEATURES.map(f => ({ ...f, included: f.pro !== false })),
  },
  {
    id: 'premium',
    name: 'Premium',
    label: 'Rp 20.000/bulan',
    price: 20000,
    badge: '👑',
    color: 'from-amber-500 to-orange-400',
    description: 'All-in-one solution dengan AI advisor, scan struk otomatis, PDF reports, dan fitur kolaborasi household.',
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

// ─── Storage keys ───
const PLAN_KEY = 'fw.plan.v1'
const PLAN_EXPIRY_KEY = 'fw.plan.expiry'

export function loadPlan(): PlanTier {
  if (typeof window === 'undefined') return 'basic'
  try {
    // Check if plan has expired
    const raw = localStorage.getItem(PLAN_KEY)
    const expiry = localStorage.getItem(PLAN_EXPIRY_KEY)
    if (expiry && (raw === 'pro' || raw === 'premium')) {
      const expiryDate = new Date(expiry)
      if (expiryDate < new Date()) {
        // Plan expired — downgrade to basic
        localStorage.setItem(PLAN_KEY, 'basic')
        localStorage.removeItem(PLAN_EXPIRY_KEY)
        return 'basic'
      }
      return raw
    }
    if (raw === 'pro' || raw === 'premium') return raw
  } catch { /* */ }
  return 'basic'
}

export function savePlan(plan: PlanTier, expiresAt?: string) {
  try {
    localStorage.setItem(PLAN_KEY, plan)
    if (plan === 'basic') {
      localStorage.removeItem(PLAN_EXPIRY_KEY)
    } else if (expiresAt) {
      localStorage.setItem(PLAN_EXPIRY_KEY, expiresAt)
    }
  } catch { /* */ }
}

export function getPlanInfo(): { tier: PlanTier; expiresAt?: string; isActive: boolean } {
  const tier = loadPlan()
  try {
    const expiry = localStorage.getItem(PLAN_EXPIRY_KEY)
    if (tier === 'basic') {
      return { tier, isActive: true }
    }
    if (expiry) {
      const expiresAt = new Date(expiry)
      return { tier, expiresAt: expiry, isActive: expiresAt > new Date() }
    }
    // No expiry set — assume active (manual/legacy plan)
    return { tier, isActive: true }
  } catch {
    return { tier, isActive: true }
  }
}
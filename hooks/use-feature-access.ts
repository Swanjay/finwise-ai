'use client'

import { useFinwise } from '@/components/finwise-store'
import { canAccess, getFeatureLimit, type PlanTier } from '@/lib/plans'
import { useCallback, useState } from 'react'

// ─── Feature Access Hook ───
export function useFeatureAccess() {
  const { plan } = useFinwise()
  const [showUpgradeModal, setShowUpgradeModal] = useState<string | null>(null)

  const checkAccess = useCallback((featureKey: string): boolean => {
    return canAccess(plan, featureKey)
  }, [plan])

  const checkLimit = useCallback((featureKey: string): boolean | number | null => {
    return getFeatureLimit(plan, featureKey)
  }, [plan])

  const requireUpgrade = useCallback((featureKey: string): boolean => {
    if (canAccess(plan, featureKey)) return false
    setShowUpgradeModal(featureKey)
    return true
  }, [plan])

  return {
    plan,
    checkAccess,
    checkLimit,
    requireUpgrade,
    showUpgradeModal,
    setShowUpgradeModal,
  }
}

// ─── Feature Names for Upgrade Modal ───
export const FEATURE_NAMES: Record<string, string> = {
  budgets: 'Budgeting Per Kategori',
  recurring: 'Transaksi Berulang Otomatis',
  goals: 'Target Tabungan Cerdas',
  reports_charts: 'Laporan & Grafik Visual',
  export_csv: 'Export Data (CSV)',
  export_pdf: 'Export Laporan PDF',
  ai_advisor: 'AI Financial Advisor',
  ai_scan: 'Scan Struk AI (OCR)',
  household: 'Household Sharing',
  split_bill: 'Split Bill Bersama',
  tags: 'Tags & Labeling',
  notifications: 'Notifikasi Pintar',
  wallets: 'Dompet Tambahan',
  custom_categories: 'Kategori Custom Tambahan',
}
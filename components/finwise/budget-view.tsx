'use client'

import { SmartBudgetSheet } from '@/components/finwise/smart-budget'

export function BudgetView() {
  return (
    <div className="animate-in fade-in duration-300">
      <SmartBudgetSheet onClose={() => {}} embedded />
    </div>
  )
}

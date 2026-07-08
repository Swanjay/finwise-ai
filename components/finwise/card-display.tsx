'use client'

import { motion } from 'framer-motion'
import { CreditCard, Building2, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { detectLogo } from '@/lib/brand-logos'
import { formatIDR } from '@/lib/finwise'
import type { Card } from '@/lib/finwise'

// Card gradient presets
export const CARD_GRADIENTS = [
  { id: 'blue', name: 'Blue', gradient: 'from-blue-600 via-blue-800 to-indigo-900' },
  { id: 'gold', name: 'Gold', gradient: 'from-amber-400 via-amber-600 to-yellow-700' },
  { id: 'black', name: 'Black', gradient: 'from-gray-900 via-black to-gray-900' },
  { id: 'rose', name: 'Rose', gradient: 'from-rose-500 via-rose-700 to-pink-900' },
  { id: 'emerald', name: 'Emerald', gradient: 'from-emerald-500 via-emerald-700 to-teal-900' },
] as const

export function CardDisplay({ 
  card, 
  showLimit = true, 
  className,
  compact = false,
}: { 
  card: Card
  showLimit?: boolean
  className?: string
  compact?: boolean
}) {
  const logoPath = detectLogo(card.bank)
  
  // Masked number with proper spacing: **** **** **** 4521
  const maskedNumber = `**** **** **** ${card.lastFour}`
  
  // Type badge label
  const typeLabels: Record<Card['type'], string> = {
    credit: 'Kredit',
    debit: 'Debit',
    'e-wallet': 'E-Wallet',
  }
  
  const typeIcons: Record<Card['type'], typeof CreditCard> = {
    credit: CreditCard,
    debit: Building2,
    'e-wallet': Smartphone,
  }
  
  const TypeIcon = typeIcons[card.type]
  
  // Calculate limit usage for credit cards
  const usedLimit = card.usedLimit ?? 0
  const limit = card.limit ?? 0
  const usagePercent = limit > 0 ? Math.min(100, Math.round((usedLimit / limit) * 100)) : 0
  const isOverLimit = usedLimit > limit && limit > 0

  return (
    <motion.div
      className={cn(
        'relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300',
        'bg-gradient-to-br',
        card.color || CARD_GRADIENTS[0].gradient,
        compact ? 'w-64 h-40' : 'w-full max-w-[360px] aspect-[1.586/1]',
        className
      )}
      style={{ 
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3), 0 8px 16px -8px rgba(0,0,0,0.2)',
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 size-32 rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Card content */}
      <div className="relative p-5 h-full flex flex-col justify-between text-white">
        {/* Top section: Bank logo, chip, type */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {logoPath ? (
              <img 
                src={logoPath} 
                alt={`${card.bank} logo`} 
                className="h-6 w-auto max-w-[60px] drop-shadow-lg"
                loading="lazy"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Building2 className="size-4" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TypeIcon className="size-4 opacity-80" />
            <span className="text-xs font-medium opacity-90">{typeLabels[card.type]}</span>
          </div>
        </div>

        {/* Middle: Card name and number */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm font-medium opacity-80 tracking-wide uppercase">{card.name}</p>
          <p className="mt-2 font-mono text-xl font-semibold tracking-widest tabular-nums drop-shadow-lg">
            {maskedNumber}
          </p>
        </div>

        {/* Bottom: Expiry, card network, limit progress */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium opacity-60 uppercase tracking-wider">VALID THRU</p>
            <p className="font-mono text-base font-semibold tabular-nums">{card.expiry}</p>
          </div>
          
          {/* Card network indicator (Visa/Mastercard style) */}
          <div className="flex items-center gap-1 opacity-60">
            <div className="flex -space-x-1">
              <div className="size-5 rounded border border-white/30 bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center text-[8px] font-bold" />
              <div className="size-5 rounded border border-white/30 bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center text-[8px] font-bold" />
            </div>
          </div>
        </div>

        {/* Limit progress bar for credit cards */}
        {showLimit && card.type === 'credit' && card.limit && card.limit > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-4 pt-4 border-t border-white/20"
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="opacity-80">Limit Terpakai</span>
              <span className="font-semibold tabular-nums">
                {formatIDR(usedLimit)} / {formatIDR(limit)}
              </span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usagePercent}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  isOverLimit ? 'bg-rose-400' : 'bg-white',
                  usagePercent > 80 && !isOverLimit ? 'bg-amber-400' : ''
                )}
                style={{ boxShadow: '0 0 8px rgba(255,255,255,0.5)' }}
              />
            </div>
            <p className={cn('text-[10px] mt-1 text-right', isOverLimit ? 'text-rose-300' : 'text-white/60')}>
              {usagePercent}% terpakai {isOverLimit && '⚠️ Melebihi limit'}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// CARD_GRADIENTS already exported above
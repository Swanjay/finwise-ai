'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Pencil, MapPin, Camera, X } from 'lucide-react'
import { formatIDR, type Transaction, resolveCategory } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'

const SWIPE_THRESHOLD = 60
const ACTION_WIDTH = 72

export function TransactionRow({
  tx,
  onDelete,
  onEdit,
}: {
  tx: Transaction
  onDelete?: (id: string) => void
  onEdit?: (tx: Transaction) => void
}) {
  const { allCategories } = useFinwise()
  const cat = resolveCategory(tx.category, allCategories) ?? { label: tx.category, color: '#64748B', icon: null }
  const Icon = cat.icon
  const income = tx.type === 'income'
  const date = new Date(tx.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })

  const [isDeleting, setIsDeleting] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const receiptThumb = tx.receiptUrl || tx.receiptPhoto

  // Refs for touch handling — MUST use native events for passive:false
  const rowRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchRef = useRef<{ startX: number; startY: number; time: number; active: boolean } | null>(null)
  const currentOffsetRef = useRef(0)

  // Attach native touch listeners with { passive: false }
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isDragging = false
    let hasMovedEnough = false

    const onTouchStart = (e: TouchEvent) => {
      if (isDeleting) return
      const touch = e.touches[0]
      touchRef.current = { startX: touch.clientX, startY: touch.clientY, time: Date.now(), active: true }
      isDragging = false
      hasMovedEnough = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchRef.current?.active) return

      const touch = e.touches[0]
      const dx = touch.clientX - touchRef.current.startX
      const dy = touch.clientY - touchRef.current.startY

      // Decide direction on first significant movement
      if (!hasMovedEnough && Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (!hasMovedEnough) {
        hasMovedEnough = true
        // If vertical is dominant, let scroll happen
        if (Math.abs(dy) > Math.abs(dx)) {
          touchRef.current.active = false
          return
        }
        isDragging = true
      }

      if (!isDragging) return

      // CRITICAL: prevent scroll while swiping horizontally
      e.preventDefault()

      const clamped = Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, dx))
      currentOffsetRef.current = clamped
      setOffsetX(clamped)

      if (rowRef.current) {
        rowRef.current.style.transform = `translateX(${clamped}px)`
      }
    }

    const onTouchEnd = () => {
      if (!touchRef.current?.active || !isDragging) {
        touchRef.current = null
        return
      }
      const dx = currentOffsetRef.current
      const duration = Date.now() - touchRef.current.time
      const velocity = Math.abs(dx) / Math.max(duration, 1)
      const absDx = Math.abs(dx)
      touchRef.current = null

      // Fast swipe → immediate action
      if (velocity > 0.5 && absDx > SWIPE_THRESHOLD) {
        if (dx < 0) {
          haptic.heavy()
          setIsDeleting(true)
          return
        } else {
          haptic.medium()
          onEdit?.(tx)
          animateBack()
          return
        }
      }

      // Slow swipe past threshold → reveal action
      if (absDx > SWIPE_THRESHOLD) {
        haptic.light()
        const target = dx < 0 ? -ACTION_WIDTH : ACTION_WIDTH
        animateTo(target)
        return
      }

      // Not enough → snap back
      animateBack()
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false }) // ← CRITICAL: passive:false
    container.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDeleting, onEdit, tx])

  const animateBack = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
      rowRef.current.style.transform = 'translateX(0px)'
      currentOffsetRef.current = 0
      setOffsetX(0)
      setTimeout(() => {
        if (rowRef.current) rowRef.current.style.transition = ''
      }, 300)
    }
  }, [])

  const animateTo = useCallback((target: number) => {
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      rowRef.current.style.transform = `translateX(${target}px)`
      currentOffsetRef.current = target
      setOffsetX(target)
      setTimeout(() => {
        if (rowRef.current) rowRef.current.style.transition = ''
      }, 250)
    }
  }, [])

  // Click outside any revealed row to close it
  useEffect(() => {
    if (offsetX === 0) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        animateBack()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [offsetX, animateBack])

  const handleDeleteComplete = useCallback(() => {
    if (isDeleting) onDelete?.(tx.id)
  }, [isDeleting, onDelete, tx.id])

  return (
    <AnimatePresence>
      {/* Receipt photo overlay */}
      {showReceipt && receiptThumb && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowReceipt(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative max-w-sm max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={tx.receiptPhoto || receiptThumb}
              alt="Struk"
              className="rounded-xl max-h-[80vh] object-contain shadow-2xl"
            />
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute -top-2 -right-2 size-8 rounded-full bg-card shadow-lg flex items-center justify-center"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        </motion.div>
      )}

      {!isDeleting ? (
        <div
          ref={containerRef}
          className="relative overflow-hidden"
          style={{ borderRadius: 12 }}
        >
          {/* Action buttons behind the row */}
          <div className="absolute inset-0 flex">
            <div
              className="flex w-[72px] items-center justify-center bg-blue-500"
              style={{ opacity: offsetX > 10 ? Math.min(offsetX / ACTION_WIDTH, 1) : 0 }}
            >
              <div className="flex flex-col items-center gap-0.5 text-white">
                <Pencil className="size-5" />
                <span className="text-[10px] font-medium">Edit</span>
              </div>
            </div>
            <div className="flex-1" />
            <div
              className="flex w-[72px] items-center justify-center bg-red-500"
              style={{ opacity: offsetX < -10 ? Math.min(-offsetX / ACTION_WIDTH, 1) : 0 }}
            >
              <div className="flex flex-col items-center gap-0.5 text-white">
                <Trash2 className="size-5" />
                <span className="text-[10px] font-medium">Hapus</span>
              </div>
            </div>
          </div>

          {/* Swipeable row content */}
          <div
            ref={rowRef}
            className="relative z-10 flex items-center gap-3 bg-card px-2 py-2.5 select-none"
            style={{ touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {/* Receipt thumbnail or category icon */}
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 22%, transparent)` }}
              aria-hidden
            >
              {receiptThumb ? (
                <img src={receiptThumb} alt="Struk" className="size-10 rounded-full object-cover" />
              ) : Icon ? (
                <Icon className="size-5" style={{ color: cat.color }} />
              ) : (
                <span className="size-5" />
              )}
            </span>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{tx.description}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {cat.label} · {date}
                </span>
                {tx.tags && tx.tags.length > 0 && tx.tags.map((tag) => (
                  <span key={tag} className="inline-block rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary">
                    #{tag}
                  </span>
                ))}
                {tx.location && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0 text-[10px] text-blue-600">
                    <MapPin className="size-2.5" />
                    {tx.location.name.length > 15 ? tx.location.name.slice(0, 15) + '...' : tx.location.name}
                  </span>
                )}
                {receiptThumb && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowReceipt(true) }}
                    className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0 text-[10px] text-green-600 hover:bg-green-100 transition"
                    title="Lihat foto struk"
                  >
                    <Camera className="size-2.5" />
                    Struk
                  </button>
                )}
              </div>
            </div>

            {/* Amount */}
            <span
              className={cn(
                'tabular-nums text-sm font-semibold shrink-0',
                income ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
              )}
            >
              {income ? '+' : '-'}
              {formatIDR(tx.amount)}
            </span>

            {/* Quick action buttons — always visible for easy access */}
            {onDelete && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit?.(tx) }}
                  className="rounded-md p-1.5 text-blue-500 hover:bg-blue-100 active:bg-blue-200 transition"
                  aria-label={`Edit ${tx.description}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); haptic.heavy(); setIsDeleting(true) }}
                  className="rounded-md p-1.5 text-red-500 hover:bg-red-100 active:bg-red-200 transition"
                  aria-label={`Hapus ${tx.description}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ height: 'auto', opacity: 1, x: 0 }}
          animate={{ height: 0, opacity: 0, x: -300 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          onAnimationComplete={handleDeleteComplete}
          className="overflow-hidden"
          style={{ borderRadius: 12 }}
        >
          <div className="flex items-center gap-3 px-2 py-2.5">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 22%, transparent)` }}
              aria-hidden
            >
              {Icon ? <Icon className="size-5" style={{ color: cat.color }} /> : <span className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{tx.description}</p>
            </div>
            <span
              className={cn(
                'tabular-nums text-sm font-semibold',
                income ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
              )}
            >
              {income ? '+' : '-'}
              {formatIDR(tx.amount)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { useState, useCallback, useRef } from 'react'
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
  const [action, setAction] = useState<'edit' | 'delete' | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  // Use receiptUrl (thumbnail) if available, fallback to receiptPhoto
  const receiptThumb = tx.receiptUrl || tx.receiptPhoto

  const applyOffset = useCallback((x: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (rowRef.current) {
        const clamped = Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, x))
        rowRef.current.style.transform = `translateX(${clamped}px)`
        setOffsetX(clamped)
      }
    })
  }, [])

  const snapBack = useCallback(() => {
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
      rowRef.current.style.transform = 'translateX(0px)'
      setTimeout(() => {
        if (rowRef.current) rowRef.current.style.transition = ''
      }, 300)
    }
    setOffsetX(0)
    setAction(null)
  }, [])

  const snapToAction = useCallback((side: 'edit' | 'delete') => {
    const target = side === 'edit' ? ACTION_WIDTH : -ACTION_WIDTH
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      rowRef.current.style.transform = `translateX(${target}px)`
    }
    setOffsetX(target)
    setAction(side)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDeleting) return
    // If already in an action state, closing it
    if (action) {
      snapBack()
      return
    }
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }, [isDeleting, action, snapBack])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isDeleting) return
    e.preventDefault() // prevent scroll while swiping

    const touch = e.touches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y

    // If vertical movement is dominant, allow scroll
    if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 10) {
      return // Let parent handle vertical scroll
    }

    applyOffset(dx)
  }, [isDeleting, applyOffset])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || isDeleting) return
    const dx = offsetX
    const absDx = Math.abs(dx)
    const duration = Date.now() - touchStartRef.current.time
    const velocity = absDx / Math.max(duration, 1)
    touchStartRef.current = null

    // Fast swipe (velocity > 0.5 px/ms) → trigger action immediately
    if (velocity > 0.5 && absDx > SWIPE_THRESHOLD) {
      if (dx < 0) {
        // Swipe left → delete
        haptic.heavy()
        setIsDeleting(true)
        return
      } else {
        // Swipe right → edit
        haptic.medium()
        onEdit?.(tx)
        snapBack()
        return
      }
    }

    // Slow swipe → reveal action button
    if (absDx > SWIPE_THRESHOLD) {
      if (dx < 0) {
        haptic.light()
        snapToAction('delete')
      } else {
        haptic.light()
        snapToAction('edit')
      }
      return
    }

    // Not enough swipe → snap back
    if (absDx < SWIPE_THRESHOLD) {
      snapBack()
    }
  }, [isDeleting, offsetX, onEdit, tx, snapBack, snapToAction])

  // Handle delete animation complete
  const handleDeleteComplete = useCallback(() => {
    if (isDeleting) {
      onDelete?.(tx.id)
    }
  }, [isDeleting, onDelete, tx.id])

  // Mouse drag support (for desktop testing)
  const mouseStartRef = useRef<{ x: number; time: number } | null>(null)
  const isDraggingRef = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isDeleting) return
    if (action) {
      snapBack()
      return
    }
    mouseStartRef.current = { x: e.clientX, time: Date.now() }
    isDraggingRef.current = false
  }, [isDeleting, action, snapBack])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseStartRef.current || isDeleting) return
    const dx = e.clientX - mouseStartRef.current.x
    if (Math.abs(dx) > 5) {
      isDraggingRef.current = true
      applyOffset(dx)
    }
  }, [isDeleting, applyOffset])

  const handleMouseUp = useCallback(() => {
    if (!mouseStartRef.current || isDeleting) return
    const dx = offsetX
    const absDx = Math.abs(dx)
    const duration = Date.now() - mouseStartRef.current.time
    const velocity = absDx / Math.max(duration, 1)
    mouseStartRef.current = null

    if (!isDraggingRef.current) {
      // This was a click, not a drag — let default click handlers work
      return
    }
    isDraggingRef.current = false

    if (velocity > 0.5 && absDx > SWIPE_THRESHOLD) {
      if (dx < 0) {
        haptic.heavy()
        setIsDeleting(true)
        return
      } else {
        haptic.medium()
        onEdit?.(tx)
        snapBack()
        return
      }
    }

    if (absDx > SWIPE_THRESHOLD) {
      haptic.light()
      if (dx < 0) snapToAction('delete')
      else snapToAction('edit')
      return
    }

    snapBack()
  }, [isDeleting, offsetX, onEdit, tx, snapBack, snapToAction])

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
          className="relative overflow-hidden touch-pan-y"
          style={{ borderRadius: 12 }}
        >
          {/* Action buttons behind the row */}
          <div className="absolute inset-0 flex" style={{ pointerEvents: 'none' }}>
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Receipt thumbnail or category icon */}
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 22%, transparent)` }}
              aria-hidden
            >
              {receiptThumb ? (
                <img
                  src={receiptThumb}
                  alt="Struk"
                  className="size-10 rounded-full object-cover"
                />
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
                {/* Receipt camera badge */}
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
                'tabular-nums text-sm font-semibold',
                income ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
              )}
            >
              {income ? '+' : '-'}
              {formatIDR(tx.amount)}
            </span>

            {/* Quick action buttons (visible on hover / long-press) */}
            {onDelete && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(tx)
                  }}
                  className="rounded-md p-1.5 text-blue-500 hover:bg-blue-100 transition"
                  aria-label={`Edit ${tx.description}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    haptic.heavy()
                    setIsDeleting(true)
                  }}
                  className="rounded-md p-1.5 text-red-500 hover:bg-red-100 transition"
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

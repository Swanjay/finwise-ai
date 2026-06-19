'use client'

import { useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion'
import { Trash2, Pencil, MapPin } from 'lucide-react'
import { formatIDR, type Transaction } from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'

const SWIPE_THRESHOLD = 80
const ACTION_WIDTH = 80

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
  const cat = allCategories[tx.category] ?? { label: tx.category, color: 'oklch(0.5 0.1 285)', icon: null }
  const Icon = cat.icon
  const income = tx.type === 'income'
  const date = new Date(tx.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })

  const [isDeleting, setIsDeleting] = useState(false)
  const x = useMotionValue(0)

  // Reveal opacity for action buttons based on swipe distance
  const deleteOpacity = useTransform(x, [-ACTION_WIDTH * 2, -ACTION_WIDTH, 0], [1, 0.8, 0])
  const deleteScale = useTransform(x, [-ACTION_WIDTH * 2, -ACTION_WIDTH, 0], [1, 0.9, 0.5])
  const editOpacity = useTransform(x, [0, ACTION_WIDTH, ACTION_WIDTH * 2], [0, 0.8, 1])
  const editScale = useTransform(x, [0, ACTION_WIDTH, ACTION_WIDTH * 2], [0.5, 0.9, 1])

  // Background color behind the row that shows through on swipe
  const bgOpacity = useTransform(
    x,
    [-ACTION_WIDTH * 2, -ACTION_WIDTH, 0, ACTION_WIDTH, ACTION_WIDTH * 2],
    [0.3, 0.2, 0, 0.2, 0.3]
  )

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x
      const velocity = info.velocity.x

      // Swipe left → delete
      if (offset < -SWIPE_THRESHOLD || velocity < -500) {
        if (offset < -SWIPE_THRESHOLD * 1.5 || velocity < -800) {
          // Confirm delete
          haptic.heavy()
          setIsDeleting(true)
          return
        }
        // Snap to reveal delete button
        haptic.light()
        return
      }

      // Swipe right → edit
      if (offset > SWIPE_THRESHOLD || velocity > 500) {
        if (offset > SWIPE_THRESHOLD * 1.5 || velocity > 800) {
          // Confirm edit
          haptic.medium()
          onEdit?.(tx)
          return
        }
        // Snap to reveal edit button
        haptic.light()
        return
      }
    },
    [onDelete, onEdit, tx]
  )

  // Handle delete animation complete
  const handleDeleteComplete = useCallback(() => {
    if (isDeleting) {
      onDelete?.(tx.id)
    }
  }, [isDeleting, onDelete, tx.id])

  return (
    <AnimatePresence>
      {!isDeleting ? (
        <motion.li
          layout
          className="relative overflow-hidden"
          style={{ borderRadius: 12 }}
        >
          {/* Action buttons behind the row */}
          <div className="absolute inset-0 flex">
            {/* Edit button (right side, revealed on swipe right) */}
            <motion.div
              className="flex w-20 items-center justify-center bg-blue-500"
              style={{ opacity: editOpacity, scale: editScale }}
            >
              <div className="flex flex-col items-center gap-0.5 text-white">
                <Pencil className="size-5" />
                <span className="text-[10px] font-medium">Edit</span>
              </div>
            </motion.div>
            <div className="flex-1" />
            {/* Delete button (left side, revealed on swipe left) */}
            <motion.div
              className="flex w-20 items-center justify-center bg-red-500"
              style={{ opacity: deleteOpacity, scale: deleteScale }}
            >
              <div className="flex flex-col items-center gap-0.5 text-white">
                <Trash2 className="size-5" />
                <span className="text-[10px] font-medium">Hapus</span>
              </div>
            </motion.div>
          </div>

          {/* Swipeable row content */}
          <motion.div
            className="group flex items-center gap-3 bg-card px-2 py-2.5 touch-pan-y"
            style={{ x }}
            drag="x"
            dragConstraints={{ left: -ACTION_WIDTH * 1.5, right: ACTION_WIDTH * 1.5 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            whileTap={{ scale: 0.99 }}
          >
            {/* Category icon */}
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in oklch, ${cat.color} 22%, transparent)` }}
              aria-hidden
            >
              {Icon ? <Icon className="size-5" style={{ color: cat.color }} /> : <span className="size-5" />}
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
              </div>
            </div>

            {/* Amount */}
            <span
              className={cn(
                'tabular-nums text-sm font-semibold',
                income ? 'text-success' : 'text-foreground',
              )}
            >
              {income ? '+' : '-'}
              {formatIDR(tx.amount)}
            </span>

            {/* Quick action buttons (visible on hover / long-press) */}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  haptic.heavy()
                  onDelete(tx.id)
                }}
                className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                aria-label={`Hapus ${tx.description}`}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </motion.div>
        </motion.li>
      ) : (
        <motion.li
          initial={{ height: 'auto', opacity: 1, x: 0 }}
          animate={{ height: 0, opacity: 0, x: -300 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          onAnimationComplete={handleDeleteComplete}
          className="overflow-hidden"
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
                income ? 'text-success' : 'text-foreground',
              )}
            >
              {income ? '+' : '-'}
              {formatIDR(tx.amount)}
            </span>
          </div>
        </motion.li>
      )}
    </AnimatePresence>
  )
}

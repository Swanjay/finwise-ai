'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { X } from 'lucide-react'
import {
  motion,
  AnimatePresence,
  useDragControls,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from 'framer-motion'

/* ───────── constants ───────── */
const SNAP_RATIOS = [0.9, 1.0] as const // 90%, 100% of viewport

/** Convert a snap ratio (0–1) to the Y offset from top.
 *  ratio 0.5 → sheet covers bottom 50% → y = 50vh
 *  ratio 1.0 → sheet covers full screen → y = 0 */
function snapRatioToY(ratio: number, vh: number) {
  return vh * (1 - ratio)
}

/** Find the nearest snap target for `currentY`, or dismiss if velocity is high. */
function resolveSnap(
  currentY: number,
  velocityY: number,
  currentSnapIdx: number,
  vh: number,
): { y: number; dismiss: boolean } {
  // Fast downward swipe → dismiss
  if (velocityY > 900) return { y: vh, dismiss: true }

  // At smallest snap and dragged well past it → dismiss
  const minY = snapRatioToY(SNAP_RATIOS[0], vh)
  if (currentSnapIdx === 0 && currentY > minY + vh * 0.1) {
    return { y: vh, dismiss: true }
  }

  // Otherwise find closest snap
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < SNAP_RATIOS.length; i++) {
    const targetY = snapRatioToY(SNAP_RATIOS[i], vh)
    const dist = Math.abs(currentY - targetY)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = i
    }
  }
  return { y: snapRatioToY(SNAP_RATIOS[bestIdx], vh), dismiss: false }
}

/* ───────── Component ───────── */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  initialSnap = 0.9,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  initialSnap?: 0.9 | 1.0
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  const y = useMotionValue(0)
  const [snapIdx, setSnapIdx] = useState(SNAP_RATIOS.indexOf(initialSnap))
  const [isVisible, setIsVisible] = useState(false)

  const vh =
    typeof window !== 'undefined' ? window.innerHeight : 800
  const startY = snapRatioToY(SNAP_RATIOS[snapIdx], vh)

  /* Backdrop fades as the sheet is dragged down */
  const backdropOpacity = useTransform(
    y,
    [startY, vh * 0.95, vh],
    [1, 0.4, 0],
  )

  /* ── keyboard / scroll lock ── */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  /* reset on open */
  useEffect(() => {
    if (open) {
      const idx = SNAP_RATIOS.indexOf(initialSnap)
      setSnapIdx(idx)
      const targetY = snapRatioToY(SNAP_RATIOS[idx], vh)
      y.set(vh) // start off-screen
      // spring into view
      animate(y, targetY, {
        type: 'spring',
        stiffness: 380,
        damping: 36,
        mass: 0.8,
      })
      setIsVisible(true)
    } else {
      // animate out then unmount
      animate(y, vh, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }).then(() => setIsVisible(false))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── drag handling ── */
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const currentY = y.get()
      const result = resolveSnap(currentY, info.velocity.y, snapIdx, vh)

      if (result.dismiss) {
        onClose()
        return
      }

      // Find new snap index
      const newIdx = SNAP_RATIOS.findIndex(
        (r) => Math.abs(snapRatioToY(r, vh) - result.y) < 4,
      )
      if (newIdx !== -1) setSnapIdx(newIdx)

      // Spring to target
      animate(y, result.y, {
        type: 'spring',
        stiffness: 380,
        damping: 36,
        mass: 0.8,
      })
    },
    [snapIdx, onClose, vh, y],
  )

  /* Allow scroll inside content without triggering sheet drag */
  const onContentPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Stop propagation so the drag handle's pointer handler doesn't
      // interfere when the user is scrolling content.
      e.stopPropagation()
    },
    [],
  )

  const springConfig = {
    type: 'spring' as const,
    stiffness: 380,
    damping: 36,
    mass: 0.8,
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* ── Backdrop ── */}
          <motion.button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
            style={{
              opacity: backdropOpacity,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* ── Sheet ── */}
          <motion.div
            className="absolute left-0 right-0 bottom-0 mx-auto w-full max-w-md sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
            style={{
              y,
              height: '100dvh',
              touchAction: 'none',
            }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{
              top: 0,
              bottom: vh,
            }}
            dragElastic={0.08}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            transition={springConfig}
          >
            <div className="flex h-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-3xl">
              {/* ── Drag handle ── */}
              <div
                className="flex shrink-0 touch-none flex-col items-center pt-3 pb-1"
                onPointerDown={(e) =>
                  dragControls.start(e as unknown as PointerEvent)
                }
              >
                <div className="h-1.5 w-10 cursor-grab rounded-full bg-muted-foreground/30 transition-colors active:cursor-grabbing active:bg-muted-foreground/50" />
              </div>

              {/* ── Header ── */}
              <div className="flex shrink-0 items-center justify-between px-5 pb-3">
                <h2 className="font-heading text-lg font-semibold">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary"
                  aria-label="Tutup"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* ── Scrollable content ── */}
              <div
                ref={contentRef}
                className="flex-1 touch-auto overflow-y-auto overscroll-contain px-5 pb-8"
                onPointerDown={onContentPointerDown}
              >
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

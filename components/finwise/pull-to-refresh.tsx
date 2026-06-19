'use client'

import { useState, useCallback, useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { haptic } from '@/lib/haptics'

const PULL_THRESHOLD = 80
const MAX_PULL = 130

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
}

/**
 * Pull-to-refresh wrapper with framer-motion animations.
 * Works on touch devices; includes a visual indicator.
 */
export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false)
  const y = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const pulling = useRef(false)

  // Derived transforms
  const indicatorOpacity = useTransform(y, [0, 30, PULL_THRESHOLD], [0, 0.6, 1])
  const indicatorScale = useTransform(y, [0, PULL_THRESHOLD, MAX_PULL], [0.5, 1, 1.2])
  const indicatorRotate = useTransform(y, [0, MAX_PULL], [0, 360])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return
      const scrollTop = containerRef.current?.scrollTop ?? 0
      if (scrollTop > 0) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    },
    [refreshing],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return
      const diff = e.touches[0].clientY - startY.current
      if (diff > 0) {
        // Rubber-band effect
        const dampened = Math.min(diff * 0.45, MAX_PULL)
        y.set(dampened)
      }
    },
    [refreshing, y],
  )

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || refreshing) return
    pulling.current = false
    const current = y.get()

    if (current >= PULL_THRESHOLD) {
      // Trigger refresh
      setRefreshing(true)
      haptic.medium()
      // Snap to indicator position
      animate(y, 56, { type: 'spring', stiffness: 300, damping: 30 })
      try {
        await onRefresh()
      } finally {
        haptic.success()
        animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 })
        setRefreshing(false)
      }
    } else {
      // Snap back
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 })
    }
  }, [refreshing, y, onRefresh])

  return (
    <div className="relative overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2 pointer-events-none"
        style={{ opacity: indicatorOpacity }}
      >
        <motion.div
          className="flex items-center gap-2 rounded-full bg-primary/10 backdrop-blur-sm px-4 py-2"
          style={{ scale: indicatorScale }}
        >
          <motion.div style={{ rotate: refreshing ? indicatorRotate : 0 }}>
            <RefreshCw
              className={`size-4 text-primary ${refreshing ? 'animate-spin' : ''}`}
            />
          </motion.div>
          <span className="text-xs font-medium text-primary">
            {refreshing
              ? 'Memuat ulang...'
              : y.get() >= PULL_THRESHOLD
                ? 'Lepaskan untuk muat ulang'
                : 'Tarik ke bawah untuk muat ulang'}
          </span>
        </motion.div>
      </motion.div>

      {/* Scrollable content */}
      <motion.div
        ref={containerRef}
        style={{ y }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="min-h-0"
      >
        {children}
      </motion.div>
    </div>
  )
}

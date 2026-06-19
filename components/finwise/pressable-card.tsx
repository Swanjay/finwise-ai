'use client'

import { type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { haptic } from '@/lib/haptics'

interface PressableCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  className?: string
  /** Enable haptic feedback on press */
  hapticFeedback?: boolean
  /** Scale factor on press (default 0.97) */
  pressScale?: number
  /** Optional click handler */
  onClick?: () => void
}

/**
 * A card wrapper with premium press/tap animation.
 * Scales down slightly on press and bounces back on release.
 */
export function PressableCard({
  children,
  className,
  hapticFeedback = true,
  pressScale = 0.97,
  onClick,
  ...rest
}: PressableCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{
        scale: pressScale,
        transition: { type: 'spring', stiffness: 500, damping: 25 },
      }}
      onTap={() => {
        if (hapticFeedback) haptic.light()
        onClick?.()
      }}
      style={{ willChange: 'transform' }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/**
 * Subtle press effect for any interactive element.
 * Wraps children in a motion.div with tap scale.
 */
export function PressEffect({
  children,
  className,
  scale = 0.96,
}: {
  children: ReactNode
  className?: string
  scale?: number
}) {
  return (
    <motion.div
      className={className}
      whileTap={{
        scale,
        transition: { type: 'spring', stiffness: 500, damping: 25 },
      }}
      style={{ willChange: 'transform' }}
    >
      {children}
    </motion.div>
  )
}

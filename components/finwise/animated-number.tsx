'use client'

import { useEffect, useRef } from 'react'
import { useSpring, useTransform, motion, type SpringOptions } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  format?: (v: number) => string
  className?: string
  /** Duration in ms for the counting animation on mount */
  countDuration?: number
  /** Spring config for value transitions */
  springConfig?: SpringOptions
}

/**
 * Animated number display that:
 * 1. Counts up from 0 to value on mount (requestAnimationFrame)
 * 2. Smoothly transitions to new values via framer-motion spring
 */
export function AnimatedNumber({
  value,
  format,
  className,
  countDuration = 1200,
  springConfig = { stiffness: 100, damping: 30, mass: 0.8 },
}: AnimatedNumberProps) {
  const hasCountedRef = useRef(false)
  const displayValue = useSpring(0, springConfig)

  // On mount, animate from 0 → value using requestAnimationFrame for a counting effect
  useEffect(() => {
    if (hasCountedRef.current) {
      // After first mount, just set the spring target (smooth transitions)
      displayValue.set(value)
      return
    }

    hasCountedRef.current = true

    // Counting animation via rAF
    const start = performance.now()
    const from = 0
    const to = value

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / countDuration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased

      displayValue.set(current)

      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }, [value, countDuration, displayValue])

  // Transform the spring value to formatted string
  const display = useTransform(displayValue, (v) => {
    if (format) return format(Math.round(v))
    return Math.round(v).toLocaleString('id-ID')
  })

  return <motion.span className={className}>{display}</motion.span>
}

/**
 * Animated IDR formatted number (e.g., "Rp 1.234.567")
 */
export function AnimatedIDR({
  value,
  className,
  hidden,
}: {
  value: number
  className?: string
  hidden?: boolean
}) {
  if (hidden) {
    return <span className={className}>••••••</span>
  }

  return (
    <AnimatedNumber
      value={value}
      format={(v) => `Rp ${v.toLocaleString('id-ID')}`}
      className={className}
    />
  )
}

/**
 * Animated IDR without "Rp" prefix (for stat cards)
 */
export function AnimatedIDRShort({
  value,
  className,
  hidden,
}: {
  value: number
  className?: string
  hidden?: boolean
}) {
  if (hidden) {
    return <span className={className}>••••</span>
  }

  return (
    <AnimatedNumber
      value={value}
      format={(v) => v.toLocaleString('id-ID')}
      className={className}
    />
  )
}

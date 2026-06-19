'use client'

import { type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
      mass: 0.6,
    },
  },
}

interface StaggerListProps {
  children: ReactNode
  className?: string
  /** Delay before staggering starts (in seconds) */
  delay?: number
}

/**
 * Container that staggers its children into view.
 * Each direct child should be wrapped in <StaggerItem>.
 */
export function StaggerList({ children, className, delay = 0 }: StaggerListProps) {
  return (
    <motion.ul
      className={className}
      variants={{
        ...containerVariants,
        show: {
          transition: {
            staggerChildren: 0.06,
            delayChildren: delay,
          },
        },
      }}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.ul>
  )
}

interface StaggerItemProps {
  children: ReactNode
  className?: string
}

/**
 * Individual item that fades in with stagger.
 * Use inside <StaggerList>.
 */
export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.li variants={itemVariants} className={className}>
      {children}
    </motion.li>
  )
}

/**
 * Stagger container for non-list items (divs, cards, etc.)
 */
export function StaggerContainer({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      variants={{
        ...containerVariants,
        show: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: delay,
          },
        },
      }}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  )
}

/**
 * Item variant for use inside StaggerContainer (non-list context).
 */
export function StaggerChild({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}

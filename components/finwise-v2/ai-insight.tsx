'use client'

import { cn } from '@/lib/utils'
import { Lightbulb, Target } from 'lucide-react'

interface AIInsightProps {
  type?: 'suggestion' | 'goal'
  title?: string
  message: string
  className?: string
}

export function AIInsight({ type = 'suggestion', title, message, className }: AIInsightProps) {
  const isGoal = type === 'goal'

  return (
    <div
      className={cn(
        'rounded-xl p-3.5 border shadow-sm',
        isGoal
          ? 'bg-purple-50 border-purple-200/50 dark:bg-purple-950/30 dark:border-purple-800/30'
          : 'bg-primary/5 border-primary/10',
        className
      )}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {isGoal ? (
          <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        ) : (
          <Lightbulb className="w-3.5 h-3.5 text-primary" />
        )}
        <h4 className={cn(
          'text-xs font-bold',
          isGoal ? 'text-purple-700 dark:text-purple-300' : 'text-primary'
        )}>
          {title || (isGoal ? 'Goal Progress' : 'AI Insight')}
        </h4>
      </div>
      <p className={cn(
        'text-xs leading-relaxed',
        isGoal ? 'text-purple-700 dark:text-purple-300' : 'text-foreground/80'
      )}>
        {message}
      </p>
    </div>
  )
}

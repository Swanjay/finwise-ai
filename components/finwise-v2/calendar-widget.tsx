'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarWidgetProps {
  className?: string
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_HEADERS = ['Mo','Tu','We','Th','Fr','Sa','Su']

export function CalendarWidget({ className, selectedDate, onDateSelect }: CalendarWidgetProps) {
  const [viewDate, setViewDate] = useState(selectedDate || new Date())
  const today = new Date()

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const totalDays = lastDay.getDate()

    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = []

    // Previous month days
    const prevMonth = new Date(year, month, 0)
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevMonth.getDate() - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonth.getDate() - i) })
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) })
    }

    // Next month days
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) })
    }

    return days
  }, [viewDate])

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  return (
    <div className={cn('bg-card rounded-2xl p-4 border border-border shadow-sm', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
            className="w-6 h-6 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
            className="w-6 h-6 rounded-md border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-[9px] font-bold text-muted-foreground py-1">{d}</div>
        ))}
        {calendarDays.map(({ day, isCurrentMonth, date }, i) => {
          const isToday = isSameDay(date, today)
          const isSelected = selectedDate && isSameDay(date, selectedDate)

          return (
            <button
              key={i}
              onClick={() => onDateSelect?.(date)}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold mx-auto transition-all',
                !isCurrentMonth && 'text-disabled',
                isCurrentMonth && !isToday && !isSelected && 'text-foreground hover:bg-muted',
                isToday && !isSelected && 'border-2 border-primary font-bold text-foreground',
                isSelected && 'bg-primary text-primary-foreground font-bold shadow-sm',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

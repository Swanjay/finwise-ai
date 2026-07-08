'use client'

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { formatIDR, type Transaction } from '@/lib/finwise'

// ─── Types ───
interface DayData {
  date: string // YYYY-MM-DD
  amount: number
  dayOfMonth: number
  dayOfWeek: number // 0=Sun
  weekCol: number
}

interface HeatmapProps {
  transactions: Transaction[]
  months?: number // default 6
}

// ─── Thresholds (IDR) ───
const THRESHOLDS = [
  { max: 0, label: 'Tidak ada', level: 0 },
  { max: 50_000, label: 'Rendah', level: 1 },
  { max: 200_000, label: 'Sedang', level: 2 },
  { max: 500_000, label: 'Tinggi', level: 3 },
  { max: Infinity, label: 'Sangat Tinggi', level: 4 },
]

function getLevel(amount: number): number {
  for (const t of THRESHOLDS) {
    if (amount <= t.max) return t.level
  }
  return 0
}

function getLevelLabel(level: number): string {
  return THRESHOLDS.find((t) => t.level === level)?.label ?? ''
}

// ─── Month labels (Indonesian) ───
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
// Use abbreviated English day labels for the GitHub-style grid header

function formatDateID(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${Number(d)} ${MONTH_NAMES[Number(m) - 1]} ${y}`
}

// ─── Component ───
export function SpendingHeatmapFull({ transactions, months = 6 }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: DayData } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Hide tooltip on scroll outside
  useEffect(() => {
    function hide() {
      setTooltip(null)
    }
    window.addEventListener('scroll', hide, { capture: true, passive: true })
    return () => window.removeEventListener('scroll', hide, { capture: true } as EventListenerOptions)
  }, [])

  // Build the grid data: N months ending with current month
  const { gridData, monthLabels, totalSpent, mostExpensiveDay, noSpendingStreak } = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)

    // Aggregate expenses by date
    const dailyMap = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue
      const dateKey = tx.date.slice(0, 10)
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + tx.amount)
    }

    // Build date range: start from N months ago (first day of that month), end today
    const startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // last day of current month

    // Build grid: 7 rows (Sun-Sat) x variable columns
    const allDays: DayData[] = []
    const monthLabelPositions: { col: number; label: string }[] = []

    let current = new Date(startDate)
    let weekCol = 0
    let prevMonth = -1

    while (current <= endDate) {
      const dow = current.getDay() // 0=Sun
      const dateStr = current.toISOString().slice(0, 10)
      const dayNum = current.getDate()
      const monthNum = current.getMonth()
      const yearNum = current.getFullYear()

      // New month column marker
      if (monthNum !== prevMonth) {
        // Place month label at the first Sunday (col start) or first day
        if (dow === 0 || prevMonth === -1) {
          monthLabelPositions.push({ col: weekCol, label: MONTH_NAMES[monthNum] })
        }
        prevMonth = monthNum
      }

      allDays.push({
        date: dateStr,
        amount: dailyMap.get(dateStr) ?? 0,
        dayOfMonth: dayNum,
        dayOfWeek: dow,
        weekCol,
      })

      // Advance to next day
      if (dow === 6) {
        // Saturday → next week column
        weekCol++
      }
      current.setDate(current.getDate() + 1)
    }
    // Ensure we close the last week column
    weekCol++

    // Compute summary stats
    let total = 0
    let maxAmount = 0
    let maxDay = ''
    for (const [date, amount] of dailyMap) {
      total += amount
      if (amount > maxAmount) {
        maxAmount = amount
        maxDay = date
      }
    }

    // Calculate longest no-spending streak (consecutive days with 0 spending within grid range)
    let currentStreak = 0
    let maxStreak = 0
    let d = new Date(startDate)
    while (d <= endDate) {
      const ds = d.toISOString().slice(0, 10)
      const amt = dailyMap.get(ds) ?? 0
      if (amt === 0) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
      d.setDate(d.getDate() + 1)
    }

    return {
      gridData: allDays,
      monthLabels: monthLabelPositions,
      totalSpent: total,
      mostExpensiveDay: maxDay ? { date: maxDay, amount: maxAmount } : null,
      noSpendingStreak: maxStreak,
    }
  }, [transactions, months])

  const totalWeekCols = useMemo(() => {
    if (gridData.length === 0) return 0
    return Math.max(...gridData.map((d) => d.weekCol)) + 1
  }, [gridData])

  const handleCellHover = useCallback(
    (e: React.MouseEvent, data: DayData) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const containerRect = gridRef.current?.getBoundingClientRect()
      if (!containerRect) return
      setTooltip({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
        data,
      })
    },
    [],
  )

  const handleCellLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  // Position tooltip to avoid overflow
  useEffect(() => {
    if (tooltip && tooltipRef.current) {
      const el = tooltipRef.current
      const parent = gridRef.current
      if (!parent) return
      const parentRect = parent.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const halfW = elRect.width / 2

      // Clamp horizontal position
      if (elRect.left < parentRect.left) {
        el.style.left = `${Math.max(0, tooltip.x - (parentRect.left - elRect.left))}px`
      } else if (elRect.right > parentRect.right) {
        el.style.left = `${tooltip.x - (elRect.right - parentRect.right)}px`
      }
    }
  }, [tooltip])

  // Build a lookup map for quick access
  const dayLookup = useMemo(() => {
    const map = new Map<string, DayData>()
    for (const d of gridData) map.set(d.date, d)
    return map
  }, [gridData])

  // Get today's date string for highlighting
  const todayStr = new Date().toISOString().slice(0, 10)

  // Build rows (7 rows for Sun–Sat)
  const rows = useMemo(() => {
    const result: (DayData | null)[][] = Array.from({ length: 7 }, () => [])
    for (const d of gridData) {
      result[d.dayOfWeek].push(d)
    }
    // Pad each row to totalWeekCols
    for (let r = 0; r < 7; r++) {
      while (result[r].length < totalWeekCols) {
        result[r].push(null)
      }
    }
    return result
  }, [gridData, totalWeekCols])

  const hasData = transactions.some((t) => t.type === 'expense')

  return (
    <div className="flex flex-col gap-4">
      {/* Heatmap Grid */}
      <div className="overflow-x-auto rounded-xl bg-card/50 p-4 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div ref={gridRef} className="relative inline-flex flex-col gap-0" style={{ minWidth: totalWeekCols * 16 + 28 }}>
          {/* Month labels row */}
          <div className="flex pl-7">
            {Array.from({ length: totalWeekCols }).map((_, col) => {
              const ml = monthLabels.find((m) => m.col === col)
              return (
                <div key={col} className="h-4 flex-shrink-0" style={{ width: 16 }}>
                  {ml && (
                    <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap" style={{ position: 'relative', left: 0 }}>
                      {ml.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Grid rows */}
          <div className="flex flex-col gap-0.5">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-0">
                {/* Day label */}
                <div className="flex w-7 flex-shrink-0 items-center justify-end pr-1.5">
                  {rowIdx % 2 === 1 && (
                    <span className="text-[10px] text-muted-foreground leading-none">{DAY_LABELS[rowIdx]}</span>
                  )}
                </div>
                {/* Day cells */}
                {row.map((cell, colIdx) => {
                  if (!cell) {
                    return (
                      <div
                        key={`empty-${colIdx}`}
                        className="flex-shrink-0"
                        style={{ width: 14, height: 14, margin: 1 }}
                      />
                    )
                  }

                  const level = getLevel(cell.amount)
                  const isToday = cell.date === todayStr
                  const isInFuture = cell.date > todayStr

                  // Build intensity color using primary
                  const bgClass = [
                    'bg-muted/60',                                          // Level 0: no spending
                    'bg-primary/15',                                        // Level 1: low
                    'bg-primary/35',                                        // Level 2: medium
                    'bg-primary/60',                                        // Level 3: high
                    'bg-primary/90',                                        // Level 4: very high
                  ][level]

                  const glowStyle =
                    level === 4
                      ? { boxShadow: '0 0 8px 2px var(--primary), 0 0 16px 4px color-mix(in srgb, var(--primary) 30%, transparent)' }
                      : {}

                  return (
                    <div
                      key={cell.date}
                      onMouseEnter={(e) => handleCellHover(e, cell)}
                      onMouseLeave={handleCellLeave}
                      onTouchStart={(e) => {
                        e.preventDefault()
                        const fakeEvent = {
                          currentTarget: e.currentTarget,
                        } as unknown as React.MouseEvent
                        handleCellHover(fakeEvent, cell)
                      }}
                      className={`flex-shrink-0 rounded-[3px] transition-all duration-150 hover:ring-2 hover:ring-foreground/20 hover:scale-125 cursor-default ${
                        isInFuture ? 'opacity-30' : ''
                      } ${bgClass} ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                      style={{
                        width: 14,
                        height: 14,
                        ...glowStyle,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              ref={tooltipRef}
              className="pointer-events-none absolute z-50 flex flex-col items-center rounded-xl bg-card px-3 py-2 shadow-lg border border-border"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <span className="text-[11px] font-semibold text-foreground">
                {formatDateID(tooltip.data.date)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {tooltip.data.amount > 0 ? formatIDR(tooltip.data.amount) : 'Tidak ada pengeluaran'}
              </span>
              {tooltip.data.amount > 0 && (
                <span className="text-[10px] text-primary font-medium">
                  {getLevelLabel(getLevel(tooltip.data.amount))}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <span>Sedikit</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <div
            key={lvl}
            className={`rounded-[2px] ${[
              'bg-muted/60',
              'bg-primary/15',
              'bg-primary/35',
              'bg-primary/60',
              'bg-primary/90',
            ][lvl]}`}
            style={{ width: 12, height: 12 }}
          />
        ))}
        <span>Banyak</span>
      </div>

      {/* Summary Stats */}
      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="grid grid-cols-3 gap-2"
        >
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Total Pengeluaran</p>
            <p className="text-xs font-semibold tabular-nums text-foreground">
              {totalSpent > 0 ? formatIDR(totalSpent) : 'Rp0'}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Hari Termahal</p>
            <p className="text-xs font-semibold tabular-nums text-foreground">
              {mostExpensiveDay ? formatDateID(mostExpensiveDay.date) : '—'}
            </p>
            {mostExpensiveDay && (
              <p className="text-[10px] tabular-nums text-primary">
                {formatIDR(mostExpensiveDay.amount)}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Streak Hemat</p>
            <p className="text-xs font-semibold tabular-nums text-foreground">
              {noSpendingStreak > 0 ? `${noSpendingStreak} hari` : '—'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default SpendingHeatmapFull

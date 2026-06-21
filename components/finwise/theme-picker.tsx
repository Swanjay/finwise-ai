'use client'

import { useState, useEffect } from 'react'
import { THEMES, applyTheme, getStoredThemeId, type ThemeColors } from '@/lib/themes'
import { cn } from '@/lib/utils'

export function ThemePicker() {
  const [activeId, setActiveId] = useState<string>('purple')

  useEffect(() => {
    setActiveId(getStoredThemeId())
  }, [])

  function handleSelect(theme: ThemeColors) {
    setActiveId(theme.id)
    applyTheme(theme.id)
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Pilih tema warna untuk tampilan gelap:
      </p>
      <div className="grid grid-cols-5 gap-2">
        {THEMES.map((theme) => {
          const isActive = activeId === theme.id
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all',
                isActive
                  ? 'ring-2 ring-primary bg-primary/15 scale-105'
                  : 'bg-muted/50 hover:bg-muted/80 hover:scale-102'
              )}
              title={theme.description}
            >
              {/* Color dot */}
              <div
                className="size-8 rounded-full shrink-0 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${theme.dark.primary} 0%, ${theme.dark.primaryLight} 100%)`,
                  boxShadow: isActive
                    ? `0 4px 12px ${theme.dark.primary}66`
                    : 'none',
                }}
              />
              {/* Label */}
              <span
                className={cn(
                  'text-[10px] font-semibold leading-tight text-center',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {theme.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

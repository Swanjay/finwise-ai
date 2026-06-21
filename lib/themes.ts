// lib/themes.ts
// FinWise Theme System — 5 color themes for both light & dark mode

export interface ThemePalette {
  bg: string
  card: string
  surface2: string
  primary: string
  primaryLight: string
  greetingBg: string
  border: string
  mutedFg: string
}

export interface ThemeColors {
  name: string
  id: string
  emoji: string
  description: string
  dark: ThemePalette
  light: ThemePalette
}

export const THEMES: ThemeColors[] = [
  {
    name: 'Ungu',
    id: 'purple',
    emoji: '💜',
    description: 'Klasik & elegan',
    dark: {
      bg: '#1a1625',
      card: '#231e30',
      surface2: '#2a2438',
      primary: '#9b7fd4',
      primaryLight: '#c4a0e8',
      greetingBg: '#3a2d5a',
      border: 'rgba(155, 127, 212, 0.15)',
      mutedFg: '#9b8ab8',
    },
    light: {
      bg: '#F5F3FF',
      card: '#FFFFFF',
      surface2: '#EDE9FF',
      primary: '#8A6ECF',
      primaryLight: '#D0BFF5',
      greetingBg: '#EDE9FF',
      border: 'rgba(138, 110, 207, 0.15)',
      mutedFg: '#7C7A8A',
    },
  },
  {
    name: 'Emerald',
    id: 'emerald',
    emoji: '🟢',
    description: 'Segar — GoPay / Jago',
    dark: {
      bg: '#0a1f15',
      card: '#122a1f',
      surface2: '#1a3528',
      primary: '#059669',
      primaryLight: '#34d399',
      greetingBg: '#064e3b',
      border: 'rgba(52, 211, 153, 0.15)',
      mutedFg: '#5eead4',
    },
    light: {
      bg: '#ECFDF5',
      card: '#FFFFFF',
      surface2: '#D1FAE5',
      primary: '#059669',
      primaryLight: '#A7F3D0',
      greetingBg: '#D1FAE5',
      border: 'rgba(5, 150, 105, 0.15)',
      mutedFg: '#6B7280',
    },
  },
  {
    name: 'Royal Blue',
    id: 'blue',
    emoji: '🔵',
    description: 'Terpercaya — OVO / Bank',
    dark: {
      bg: '#0c1929',
      card: '#142740',
      surface2: '#1a3252',
      primary: '#2563eb',
      primaryLight: '#60a5fa',
      greetingBg: '#172554',
      border: 'rgba(96, 165, 250, 0.15)',
      mutedFg: '#93c5fd',
    },
    light: {
      bg: '#EFF6FF',
      card: '#FFFFFF',
      surface2: '#DBEAFE',
      primary: '#2563eb',
      primaryLight: '#93C5FD',
      greetingBg: '#DBEAFE',
      border: 'rgba(37, 99, 235, 0.15)',
      mutedFg: '#6B7280',
    },
  },
  {
    name: 'Slate',
    id: 'slate',
    emoji: '⚪',
    description: 'Minimalis — Wise / Monzo',
    dark: {
      bg: '#0f172a',
      card: '#1e293b',
      surface2: '#334155',
      primary: '#64748b',
      primaryLight: '#94a3b8',
      greetingBg: '#1e293b',
      border: 'rgba(148, 163, 184, 0.15)',
      mutedFg: '#94a3b8',
    },
    light: {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      surface2: '#E2E8F0',
      primary: '#475569',
      primaryLight: '#94A3B8',
      greetingBg: '#E2E8F0',
      border: 'rgba(71, 85, 105, 0.15)',
      mutedFg: '#6B7280',
    },
  },
  {
    name: 'Amber',
    id: 'amber',
    emoji: '🟠',
    description: 'Energik — DANA / ShopeePay',
    dark: {
      bg: '#1a120a',
      card: '#2a2015',
      surface2: '#352a1c',
      primary: '#d97706',
      primaryLight: '#fbbf24',
      greetingBg: '#451a03',
      border: 'rgba(251, 191, 36, 0.15)',
      mutedFg: '#fcd34d',
    },
    light: {
      bg: '#FFFBEB',
      card: '#FFFFFF',
      surface2: '#FEF3C7',
      primary: '#d97706',
      primaryLight: '#FCD34D',
      greetingBg: '#FEF3C7',
      border: 'rgba(217, 119, 6, 0.15)',
      mutedFg: '#6B7280',
    },
  },
]

const STORAGE_KEY = 'fw.colorTheme.v1'
const DEFAULT_THEME = 'emerald'

export function getStoredThemeId(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function getThemeById(id: string): ThemeColors {
  return THEMES.find((t) => t.id === id) || THEMES[0]
}

export function getCurrentTheme(): ThemeColors {
  return getThemeById(getStoredThemeId())
}

function isDarkMode(): boolean {
  if (typeof window === 'undefined') return true
  return document.documentElement.classList.contains('dark')
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function applyTheme(themeId: string) {
  if (typeof window === 'undefined') return
  const theme = getThemeById(themeId)
  const dark = isDarkMode()
  const palette = dark ? theme.dark : theme.light

  const root = document.documentElement

  // Apply all CSS variables based on current mode
  root.style.setProperty('--background', palette.bg)
  root.style.setProperty('--card', palette.card)
  root.style.setProperty('--popover', palette.card)
  root.style.setProperty('--surface-2', palette.surface2)
  root.style.setProperty('--primary', palette.primary)
  root.style.setProperty('--accent', palette.primaryLight)
  root.style.setProperty('--muted', palette.surface2)
  root.style.setProperty('--muted-foreground', palette.mutedFg)
  root.style.setProperty('--border', palette.border)
  root.style.setProperty('--input', palette.border)
  root.style.setProperty('--ring', palette.primary)
  root.style.setProperty('--sidebar', palette.card)
  root.style.setProperty('--sidebar-primary', palette.primary)
  root.style.setProperty('--sidebar-accent', palette.surface2)
  root.style.setProperty('--sidebar-border', palette.border)
  root.style.setProperty('--sidebar-ring', palette.primary)

  // Greeting card
  root.style.setProperty('--greeting-bg', palette.greetingBg)

  // Clay-purple variables (used by bottom nav active tab, box-shadows, etc.)
  const pl = palette.primaryLight
  const pp = palette.primary
  root.style.setProperty('--color-clay-purple', pl)
  root.style.setProperty('--color-clay-purple-deep', pp)

  // Box-shadow with theme color
  const { r, g, b } = hexToRgb(palette.primary)
  root.style.setProperty('--theme-shadow', `rgba(${r},${g},${b},0.15)`)
  root.style.setProperty('--theme-shadow-strong', `rgba(${r},${g},${b},0.3)`)

  // Card border
  root.style.setProperty('--card-border', palette.border)

  // Clay cards dark backgrounds (same variable names for both modes)
  root.style.setProperty('--clay-card-dark', palette.card)
  root.style.setProperty('--clay-greeting-dark', palette.greetingBg)
  root.style.setProperty('--clay-nav-dark', palette.card)

  // Persist
  try {
    localStorage.setItem(STORAGE_KEY, themeId)
  } catch {}

  // Dispatch event for components that need to react
  window.dispatchEvent(new CustomEvent('theme-change', { detail: themeId }))
}

// Listen for dark/light mode toggle and re-apply theme
export function watchThemeToggle() {
  if (typeof window === 'undefined') return

  // Create a MutationObserver to watch class changes on <html>
  const observer = new MutationObserver(() => {
    applyTheme(getStoredThemeId())
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
}

// Apply default theme on load (client-side only)
export function initTheme() {
  if (typeof window === 'undefined') return
  applyTheme(getStoredThemeId())
  watchThemeToggle()
}

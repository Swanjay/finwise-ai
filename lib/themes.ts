// lib/themes.ts
// FinWise Theme System — 5 color themes for dark mode

export interface ThemeColors {
  name: string
  id: string
  emoji: string
  description: string
  // Dark mode
  dark: {
    bg: string           // main background
    card: string         // card surfaces
    surface2: string     // secondary surfaces (input bg, etc.)
    primary: string      // primary accent
    primaryLight: string // lighter primary for borders/icons
    greetingBg: string   // greeting card bg
    border: string       // border with alpha
    mutedFg: string      // muted text
  }
  // Light mode (primary/accent changes, bg stays lavender)
  light: {
    primary: string
    accent: string
    ring: string
  }
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
      primary: '#8A6ECF',
      accent: '#F9A8D4',
      ring: '#8A6ECF',
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
      primary: '#059669',
      accent: '#6ee7b7',
      ring: '#059669',
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
      primary: '#2563eb',
      accent: '#93c5fd',
      ring: '#2563eb',
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
      primary: '#475569',
      accent: '#94a3b8',
      ring: '#475569',
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
      primary: '#d97706',
      accent: '#fcd34d',
      ring: '#d97706',
    },
  },
]

const STORAGE_KEY = 'fw.theme.v1'
const DEFAULT_THEME = 'purple'

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

export function applyTheme(themeId: string) {
  if (typeof window === 'undefined') return
  const theme = getThemeById(themeId)
  const root = document.documentElement

  // Apply dark mode variables
  root.style.setProperty('--background', theme.dark.bg)
  root.style.setProperty('--card', theme.dark.card)
  root.style.setProperty('--popover', theme.dark.card)
  root.style.setProperty('--surface-2', theme.dark.surface2)
  root.style.setProperty('--primary', theme.dark.primary)
  root.style.setProperty('--accent', theme.dark.primaryLight)
  root.style.setProperty('--muted', theme.dark.surface2)
  root.style.setProperty('--muted-foreground', theme.dark.mutedFg)
  root.style.setProperty('--border', theme.dark.border)
  root.style.setProperty('--input', theme.dark.border)
  root.style.setProperty('--ring', theme.dark.primary)
  root.style.setProperty('--sidebar', theme.dark.card)
  root.style.setProperty('--sidebar-primary', theme.dark.primary)
  root.style.setProperty('--sidebar-accent', theme.dark.surface2)
  root.style.setProperty('--sidebar-border', theme.dark.border)
  root.style.setProperty('--sidebar-ring', theme.dark.primary)

  // Update greeting card background (via custom property)
  root.style.setProperty('--greeting-bg', theme.dark.greetingBg)

  // Update light mode variables (for light mode)
  root.style.setProperty('--primary', theme.dark.primary)

  // Update clay cards dark backgrounds
  root.style.setProperty('--clay-card-dark', theme.dark.card)
  root.style.setProperty('--clay-greeting-dark', theme.dark.greetingBg)
  root.style.setProperty('--clay-nav-dark', theme.dark.card)

  // Persist
  try {
    localStorage.setItem(STORAGE_KEY, themeId)
  } catch {}

  // Dispatch event for components that need to react
  window.dispatchEvent(new CustomEvent('theme-change', { detail: themeId }))
}

// Apply default theme on load (client-side only)
export function initTheme() {
  if (typeof window === 'undefined') return
  applyTheme(getStoredThemeId())
}

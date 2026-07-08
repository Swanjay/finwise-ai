'use client'

import { cn } from '@/lib/utils'
import {
  Home, Wallet, ArrowDownUp, BarChart3, Target, ReceiptText,
  TrendingUp, Lightbulb, Settings, User, CreditCard, Bell,
  Search, PiggyBank, type LucideIcon,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: string | number
  badgeVariant?: 'default' | 'warning' | 'accent'
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'accounts', label: 'Accounts', icon: Wallet, badge: 4 },
  { id: 'transactions', label: 'Transactions', icon: ArrowDownUp },
  { id: 'budget', label: 'Budget', icon: BarChart3, badge: '65%' },
  { id: 'goals', label: 'Goals', icon: Target, badge: 3 },
  { id: 'bills', label: 'Bills', icon: ReceiptText, badge: 2, badgeVariant: 'warning' },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
  { id: 'ai-insight', label: 'AI Insight', icon: Lightbulb },
]

interface SidebarNavProps {
  activeId?: string
  onNavigate?: (id: string) => void
  className?: string
}

export function SidebarNav({ activeId = 'dashboard', onNavigate, className }: SidebarNavProps) {
  return (
    <div className={cn('space-y-0.5', className)}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeId === item.id
        const Icon = item.icon

        return (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className={cn('text-xs flex-1', isActive ? 'font-bold' : 'font-semibold')}>
              {item.label}
            </span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  'h-4 min-w-[16px] px-1.5 rounded-full flex items-center justify-center text-[9px] font-bold',
                  item.badgeVariant === 'warning'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : item.badgeVariant === 'accent'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface MobileBottomNavProps {
  activeId?: string
  onNavigate?: (id: string) => void
  className?: string
}

const MOBILE_NAV = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'transactions', label: 'Tx', icon: ArrowDownUp },
  { id: 'profile', label: 'Profile', icon: User },
]

export function MobileBottomNav({ activeId = 'dashboard', onNavigate, className }: MobileBottomNavProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-around h-14 bg-card border-t border-border',
        'rounded-t-3xl shadow-[0_-4px_16px_rgba(0,0,0,0.04)]',
        className
      )}
    >
      {MOBILE_NAV.map((item) => {
        const isActive = activeId === item.id
        const Icon = item.icon

        return (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            className="flex flex-col items-center gap-0.5 p-1"
          >
            <Icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
            <span className={cn('text-[9px] font-semibold', isActive ? 'text-primary font-bold' : 'text-muted-foreground')}>
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface DesktopSidebarProps {
  activeId?: string
  onNavigate?: (id: string) => void
  className?: string
}

export function DesktopSidebar({ activeId, onNavigate, className }: DesktopSidebarProps) {
  return (
    <div
      className={cn(
        'w-16 bg-[var(--sidebar)] flex flex-col items-center py-3 gap-1',
        'rounded-r-2xl shadow-[4px_0_24px_rgba(0,0,0,0.08)]',
        className
      )}
    >
      <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-md">
        <span className="text-sm font-black text-primary-foreground">F</span>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.slice(0, 8).map((item) => {
          const isActive = activeId === item.id
          const Icon = item.icon

          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                isActive
                  ? 'bg-[var(--sidebar-active)] shadow-sm'
                  : 'hover:bg-[var(--sidebar-active)]'
              )}
            >
              <Icon className={cn('w-[18px] h-[18px]', isActive ? 'text-primary' : 'text-[var(--sidebar-muted)]')} />
            </button>
          )
        })}
      </nav>

      <div className="flex flex-col gap-0.5">
        <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--sidebar-active)] transition-all">
          <Settings className="w-[18px] h-[18px] text-[var(--sidebar-muted)]" />
        </button>
        <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--sidebar-active)] transition-all">
          <User className="w-[18px] h-[18px] text-[var(--sidebar-muted)]" />
        </button>
      </div>
    </div>
  )
}

interface HeaderBarProps {
  title?: string
  className?: string
}

export function HeaderBar({ title = 'Dashboard', className }: HeaderBarProps) {
  return (
    <div className={cn('h-14 flex items-center justify-between px-5 border-b border-border bg-card', className)}>
      <h1 className="text-lg font-extrabold text-foreground tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        <button className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
          <Search className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="w-9 h-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors">
          <User className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

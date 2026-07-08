'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Moon, Sun, Download, LogOut } from 'lucide-react'
import { useFinwise } from '@/components/finwise-store'
import { BottomSheet } from '@/components/finwise/bottom-sheet'
import { useGamification, BadgeGrid } from '@/components/finwise/gamification'
import { AchievementsList } from '@/components/finwise/mascot'
import { ThemePicker } from '@/components/finwise/theme-picker'
import { RequestNotificationButton } from '@/components/finwise/smart-notifications'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { formatIDRInput, parseIDRInput, EXPENSE_CATEGORIES } from '@/lib/finwise'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'

function SettingsSheetContent({ onClose, onOpenSheet }: { onClose: () => void; onOpenSheet?: (sheet: string | null) => void }) {
  const { monthlyIncome, updateMonthlyIncome, budgets, setBudget, theme, toggleTheme, fontSize, setFontSize, compactMode, toggleCompactMode, resetAll, transactions } = useFinwise()
  const { stats } = useGamification()
  const [incStr, setIncStr] = useState(String(monthlyIncome))
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Calculate achievements based on transactions
  const achievements = [
    { id: 'first-transaction', title: 'Transaksi Pertama', description: 'Catat transaksi pertamamu', icon: '🎉', unlocked: transactions.length >= 1 },
    { id: 'ten-transactions', title: 'Aktif Mencatat', description: 'Catat 10 transaksi', icon: '📝', unlocked: transactions.length >= 10 },
    { id: 'fifty-transactions', title: 'Master Keuangan', description: 'Catat 50 transaksi', icon: '🏆', unlocked: transactions.length >= 50 },
    { id: 'first-budget', title: 'Budget Master', description: 'Atur anggaran pertama', icon: '💰', unlocked: Object.keys(budgets).length > 0 },
    { id: 'scanner', title: 'Scanner Pro', description: 'Scan struk pertama', icon: '📸', unlocked: false },
    { id: 'saver', title: 'Hemat Hebat', description: 'Surplus 3 bulan berturut', icon: '💎', unlocked: false },
  ]

  return (
    <div className="flex flex-col gap-5 ">
      {/* Theme */}
      <div className="flex items-center justify-between">
        <span className="text-sm">Tema</span>
        <Button size="sm" variant="outline" onClick={toggleTheme} className="gap-2">
          {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
          {theme === 'dark' ? 'Dark' : 'Light'}
        </Button>
      </div>

      {/* Warna Tema */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm">Warna Aksen</Label>
        <ThemePicker />
      </div>

      {/* Font Size */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm">Ukuran Font</Label>
        <div className="flex gap-2">
          {([
            { id: 'sm' as const, label: 'Kecil', preview: 'A' },
            { id: 'base' as const, label: 'Normal', preview: 'A' },
            { id: 'lg' as const, label: 'Besar', preview: 'A' },
          ]).map((s) => (
            <button
              key={s.id}
              onClick={() => setFontSize(s.id)}
              className={cn(
                'flex-1 rounded-xl border px-3 py-2 text-center font-medium transition',
                fontSize === s.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-secondary'
              )}
            >
              <span className={cn(
                'block font-bold',
                s.id === 'sm' && 'text-xs',
                s.id === 'base' && 'text-sm',
                s.id === 'lg' && 'text-base'
              )}>{s.preview}</span>
              <span className="text-[10px]">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compact Mode */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm">Mode Kompak</span>
          <p className="text-[10px] text-muted-foreground">Kurangi padding & jarak elemen</p>
        </div>
        <button
          onClick={toggleCompactMode}
          aria-label={compactMode ? 'Nonaktifkan mode kompak' : 'Aktifkan mode kompak'}
          className={cn(
            'relative flex h-7 w-12 items-center rounded-full p-0.5 transition-colors',
            compactMode ? 'bg-primary' : 'bg-secondary'
          )}
        >
          <span className={cn(
            'size-6 rounded-full bg-card shadow-md transition-transform',
            compactMode && 'translate-x-5'
          )} />
        </button>
      </div>

      {/* Income */}
      <div className="flex flex-col gap-1.5">
        <Label>Pemasukan Bulanan (Rp)</Label>
        <div className="flex gap-2">
          <Input inputMode="numeric" placeholder="0" value={formatIDRInput(incStr)} onChange={(e) => setIncStr(e.target.value.replace(/\D/g, ''))} className="h-10 tabular-nums" />
          <Button size="sm" onClick={() => updateMonthlyIncome(parseIDRInput(incStr))}>Simpan</Button>
        </div>
      </div>

      {/* Budgets */}
      <div>
        <Label className="mb-3 block">Anggaran per Kategori (Rp)</Label>
        <div className="flex flex-col gap-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.id} className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-xs">{c.label}</span>
                <Input inputMode="numeric" placeholder="0" defaultValue={formatIDRInput(String(budgets[c.id] || ''))} onBlur={(e) => setBudget(c.id, parseIDRInput(e.target.value))} className="w-24 h-7 text-xs tabular-nums text-right" />
              </div>
            )
          })}
        </div>
      </div>

      {/* Export & Import */}
      <div className="border-t border-border pt-4">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => { onClose(); onOpenSheet?.('export') }}
        >
          <Download className="size-4" />
          Ekspor & Impor Data
        </Button>
      </div>

      {/* Reset Data */}
      <div className="border-t border-destructive/20 pt-4">
        {!showResetConfirm ? (
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setShowResetConfirm(true)}
          >
            🗑️ Bersihkan Semua Data
          </Button>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">⚠️ Yakin mau hapus semua?</p>
            <p className="text-xs text-muted-foreground">
              Semua transaksi, anggaran, target, dan pengaturan akan dihapus permanen. Tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowResetConfirm(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => {
                  resetAll()
                  setShowResetConfirm(false)
                  onClose()
                  // Reload to trigger setup flow
                  window.location.reload()
                }}
              >
                Ya, Hapus Semua
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2">
          <span>🏆</span> Pencapaian
        </Label>
        <AchievementsList achievements={achievements} />
      </div>

      {/* Badges */}
      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2">
          <span>🎖️</span> Badge Collection
        </Label>
        <BadgeGrid badges={stats.badges} />
      </div>

      {/* Smart Budget */}
      <Button variant="outline" className="gap-2" onClick={() => { haptic.light(); onClose(); onOpenSheet?.('smart-budget') }}>
        <span>🤖</span> Smart Budget
      </Button>

      {/* My Cards */}
      <Button variant="outline" className="gap-2" onClick={() => { haptic.light(); onClose(); onOpenSheet?.('cards') }}>
        <span>💳</span> Kartu Saya
      </Button>

      {/* Smart Notifications */}
      <div className="flex flex-col gap-2">
        <Label className="flex items-center gap-2">
          <span>🔔</span> Notifikasi
        </Label>
        <RequestNotificationButton />
      </div>

      {/* About */}
      <Link href="/about" className="w-full">
        <Button variant="outline" className="w-full gap-2">
          <span>🐱</span> Tentang FinWise
        </Button>
      </Link>

      {/* Logout */}
      <div className="border-t border-destructive/20 pt-4">
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => { onClose(); signOut({ callbackUrl: '/login' }) }}
        >
          <LogOut className="size-4" /> Keluar
        </Button>
      </div>

      <Button variant="secondary" onClick={onClose}>Tutup</Button>
    </div>
  )
}

export function SettingsSheet({ open, onClose, onOpenSheet }: { open: boolean; onClose: () => void; onOpenSheet?: (sheet: string | null) => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Pengaturan" initialSnap={0.9}>
      <SettingsSheetContent onClose={onClose} onOpenSheet={onOpenSheet} />
    </BottomSheet>
  )
}

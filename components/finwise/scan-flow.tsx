'use client'

import { useRef, useState } from 'react'
import { Camera, Check, Loader2, Sparkles, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  EXPENSE_CATEGORIES,
  formatIDR,
  type CategoryId,
} from '@/lib/finwise'
import { useFinwise } from '@/components/finwise-store'
import { cn } from '@/lib/utils'

type Step = 'idle' | 'scanning' | 'confirm'

const VALID_CATEGORIES: CategoryId[] = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'bills',
  'health',
  'education',
  'internet',
]

interface ScanResult {
  store: string
  amount: number
  category: CategoryId
  date: string
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    const isLarge = file.size > 2 * 1024 * 1024 // 2MB
    reader.onerror = reject
    if (isLarge) {
      // Use canvas to compress
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 1600
        const scale = Math.min(1, maxW / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) { reader.readAsDataURL(file); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = () => reader.readAsDataURL(file)
      reader.onload = () => { img.src = reader.result as string }
      reader.readAsDataURL(file)
    } else {
      reader.readAsDataURL(file)
    }
  })
}

// Check if running inside Capacitor native
function isNative(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

async function getCameraPhoto(): Promise<string | null> {
  try {
    const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await CapCamera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // ask: camera or gallery
      width: 1600,
    })
    return photo.dataUrl || null
  } catch (err: any) {
    // User cancelled or plugin unavailable
    console.warn('Camera error:', err)
    return null
  }
}

export function ScanFlow({ onDone }: { onDone: () => void }) {
  const { addTransaction } = useFinwise()
  const [step, setStep] = useState<Step>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function processImage(image: string) {
    setError(null)
    setStep('scanning')

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ image }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 401) throw new Error('Silakan login dulu untuk scan struk.')
        if (res.status === 429) throw new Error(data.error || 'Terlalu banyak scan. Tunggu sebentar.')
        throw new Error(data.error || 'Gagal membaca struk.')
      }

      const data = (await res.json()) as Partial<ScanResult>
      const today = new Date().toISOString().slice(0, 10)
      const category =
        data.category && VALID_CATEGORIES.includes(data.category)
          ? data.category
          : 'shopping'

      setResult({
        store: data.store?.trim() || 'Struk Belanja',
        amount: Number(data.amount) || 0,
        category,
        date: data.date || today,
      })
      setStep('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca struk.')
      setStep('idle')
    }
  }

  // Native Capacitor camera button
  async function handleNativeCamera() {
    setError(null)
    const image = await getCameraPhoto()
    if (!image) return // user cancelled
    await processImage(image)
  }

  // Web file input handler
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const image = await fileToDataUrl(file)
    if (fileRef.current) fileRef.current.value = ''
    await processImage(image)
  }

  function save() {
    if (!result) return
    addTransaction({
      type: 'expense',
      category: result.category,
      amount: result.amount,
      description: result.store,
      date: result.date,
    })
    onDone()
  }

  const native = isNative()

  return (
    <div className="flex flex-col gap-5">
      {step === 'idle' && (
        <>
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <X className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="rounded-2xl border border-dashed border-primary/40 bg-surface-2/50 p-8 text-center">
            <Camera className="mx-auto size-10 text-primary" />
            <p className="mt-3 font-medium">Scan struk belanjamu</p>
            <p className="mt-1 text-sm text-muted-foreground text-balance">
              AI akan membaca nama toko, total, dan kategori secara otomatis.
            </p>
          </div>

          {native ? (
            // Native: use Capacitor Camera plugin
            <>
              <Button onClick={handleNativeCamera} className="h-12">
                <Camera className="size-5" /> Ambil Foto Struk
              </Button>
              <Button onClick={handleNativeCamera} variant="secondary" className="h-12">
                <ImageIcon className="size-5" /> Pilih dari Galeri
              </Button>
            </>
          ) : (
            // Web: use file input
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button onClick={() => fileRef.current?.click()} className="h-12">
                <Camera className="size-5" /> Ambil / Pilih Foto
              </Button>
            </>
          )}
        </>
      )}

      {step === 'scanning' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="relative">
            <Loader2 className="size-12 animate-spin text-primary" />
            <Sparkles className="absolute -right-1 -top-1 size-5 text-accent" />
          </div>
          <p className="font-medium">AI sedang membaca struk…</p>
          <p className="text-sm text-muted-foreground">Mengekstrak toko & total</p>
        </div>
      )}

      {step === 'confirm' && result && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-sm text-accent">
            <Sparkles className="size-4 shrink-0" />
            <span>AI selesai membaca. Periksa & sesuaikan sebelum simpan.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scan-store">Nama Toko / Deskripsi</Label>
            <Input
              id="scan-store"
              value={result.store}
              onChange={(e) => setResult({ ...result, store: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scan-amount">Total (Rp)</Label>
            <Input
              id="scan-amount"
              inputMode="numeric"
              value={result.amount}
              onChange={(e) =>
                setResult({ ...result, amount: Number(e.target.value) || 0 })
              }
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatIDR(result.amount)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Kategori</Label>
            <div className="grid grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map((c) => {
                const Icon = c.icon
                const active = result.category === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setResult({ ...result, category: c.id })}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] transition',
                      active
                        ? 'border-primary bg-primary/15 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="truncate">{c.label.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setStep('idle')}
            >
              <X className="size-4" /> Ulang
            </Button>
            <Button className="flex-1" onClick={save}>
              <Check className="size-4" /> Simpan
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

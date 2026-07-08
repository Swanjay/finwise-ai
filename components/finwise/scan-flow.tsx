'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Camera, Check, Loader2, Sparkles, X, Image as ImageIcon,
  RotateCcw, Trash2, Plus, Receipt, ShoppingBag, ChevronRight,
  Edit3, Eye, AlertCircle, CheckCircle2, ScanLine, Calculator,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  EXPENSE_CATEGORIES,
  formatIDR,
  formatIDRInput,
  formatIDRShort,
  type CategoryId,
  type ReceiptLineItem,
} from '@/lib/finwise'
import { detectLogo } from '@/lib/brand-logos'
import { loadPlan } from '@/lib/plans'
import { useFinwise } from '@/components/finwise-store'
import { cn } from '@/lib/utils'

type Step = 'idle' | 'scanning' | 'edit' | 'confirm'

const VALID_CATEGORIES: CategoryId[] = [
  'food', 'transport', 'shopping', 'entertainment',
  'bills', 'health', 'education', 'internet',
]

interface ScanResult {
  store: string
  amount: number
  category: CategoryId
  date: string
  items: ReceiptLineItem[]
}

const STEP_INDICATORS = [
  { key: 'idle', label: 'Foto', icon: Camera },
  { key: 'scanning', label: 'Scan', icon: Sparkles },
  { key: 'edit', label: 'Edit', icon: Edit3 },
  { key: 'confirm', label: 'Simpan', icon: Check },
]

/** Sub-step indicators shown during the scanning phase */
const SCAN_SUB_STEPS = [
  { key: 'photo', label: 'Memindai foto…', icon: ScanLine },
  { key: 'detect', label: 'Mendeteksi item…', icon: Eye },
  { key: 'total', label: 'Menghitung total…', icon: Calculator },
]

// ─── Compression: shrink image to ~200KB JPEG thumbnail ───
function compressToThumbnail(dataUrl: string, targetKB = 200): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // Scale down to max 600px wide for thumbnail
      const maxW = 600
      const scale = Math.min(1, maxW / img.width)
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(dataUrl); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Try progressively lower quality to hit target size
      let quality = 0.7
      let result = ''
      for (let q = quality; q >= 0.1; q -= 0.1) {
        result = canvas.toDataURL('image/jpeg', q)
        const sizeKB = Math.round((result.length * 3) / 4 / 1024)
        if (sizeKB <= targetKB) break
      }
      resolve(result)
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    const isLarge = file.size > 2 * 1024 * 1024
    reader.onerror = reject
    if (isLarge) {
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
      source: CameraSource.Camera,
      width: 1600,
    })
    return photo.dataUrl || null
  } catch (err: any) {
    console.warn('Camera error:', err)
    return null
  }
}

async function getGalleryPhoto(): Promise<string | null> {
  try {
    const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await CapCamera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      width: 1600,
    })
    return photo.dataUrl || null
  } catch (err: any) {
    console.warn('Gallery error:', err)
    return null
  }
}

// ─── Animated scanning sub-step indicator ───
function ScanningSteps() {
  const [subIdx, setSubIdx] = useState(0)

  useEffect(() => {
    // Cycle through sub-steps every 1.5s
    const t1 = setTimeout(() => setSubIdx(1), 1500)
    const t2 = setTimeout(() => setSubIdx(2), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="flex flex-col items-center gap-5 py-8">
      {/* Animated receipt icon */}
      <div className="relative">
        <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Receipt className="size-8 text-primary animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-primary flex items-center justify-center shadow-md">
          <Loader2 className="size-4 text-primary-foreground animate-spin" />
        </div>
      </div>

      {/* Sub-step progress indicators */}
      <div className="flex flex-col items-center gap-3 w-full max-w-[260px]">
        {SCAN_SUB_STEPS.map((s, i) => {
          const Icon = s.icon
          const active = i <= subIdx
          const isCurrent = i === subIdx
          const done = i < subIdx
          return (
            <div
              key={s.key}
              className={cn(
                'flex items-center gap-2.5 w-full rounded-lg px-3 py-2 transition-all duration-500',
                isCurrent
                  ? 'bg-primary/15 text-foreground'
                  : done
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-muted/50 text-muted-foreground',
              )}
            >
              {done ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <Icon className="size-4 shrink-0 opacity-40" />
              )}
              <span className={cn('text-sm', isCurrent && 'font-medium')}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Retry notice */}
      <p className="text-xs text-muted-foreground">Proses ini biasanya 5–10 detik</p>
    </div>
  )
}

// Step indicator bar
function StepBar({ current }: { current: Step }) {
  const stepOrder: Step[] = ['idle', 'scanning', 'edit', 'confirm']
  const currentIdx = stepOrder.indexOf(current)

  return (
    <div className="flex items-center justify-center gap-1 mb-4">
      {STEP_INDICATORS.map((s, i) => {
        const Icon = s.icon
        const active = i <= currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={s.key} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                isCurrent
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : active
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="size-3" />
              {s.label}
            </div>
            {i < STEP_INDICATORS.length - 1 && (
              <div className={cn('w-4 h-px mx-0.5', active && i < currentIdx ? 'bg-primary' : 'bg-muted')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Receipt photo preview thumbnail
function ReceiptThumb({ photo, onView }: { photo: string; onView: () => void }) {
  return (
    <button
      type="button"
      onClick={onView}
      className="relative group shrink-0 rounded-lg overflow-hidden border border-border shadow-sm w-16 h-20"
    >
      <img src={photo} alt="Struk" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
        <Eye className="size-4 text-white" />
      </div>
    </button>
  )
}

// Editable item row with category & description
function ItemRow({
  item,
  index,
  onUpdate,
  onRemove,
}: {
  item: ReceiptLineItem
  index: number
  onUpdate: (idx: number, item: ReceiptLineItem) => void
  onRemove: (idx: number) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card/80 p-2.5 space-y-2 group">
      {/* Row 1: name + delete */}
      <div className="flex items-center gap-2">
        <Input
          value={item.name}
          onChange={(e) => onUpdate(index, { ...item, name: e.target.value })}
          className="h-8 text-sm flex-1"
          placeholder="Nama item"
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {/* Row 2: qty + price */}
      <div className="flex items-center gap-2">
        {item.qty !== undefined && (
          <div className="w-14">
            <Input
              type="number"
              min={1}
              value={item.qty}
              onChange={(e) => onUpdate(index, { ...item, qty: Number(e.target.value) || 1 })}
              className="h-7 text-xs text-center"
              placeholder="Qty"
            />
          </div>
        )}
        <div className="flex-1">
          <Input
            type="number"
            inputMode="numeric"
            value={item.price}
            onChange={(e) => onUpdate(index, { ...item, price: Number(e.target.value) || 0 })}
            className="h-7 text-sm text-right tabular-nums"
            placeholder="Rp"
          />
        </div>
      </div>
      {/* Row 3 (optional): category selector */}
      <div className="flex items-center gap-2">
        <Tag className="size-3 text-muted-foreground shrink-0" />
        <select
          value={item.category || ''}
          onChange={(e) => onUpdate(index, { ...item, category: e.target.value as CategoryId || undefined })}
          className="flex-1 h-7 text-xs rounded-md border border-border bg-background px-2 text-muted-foreground"
        >
          <option value="">Kategori (opsional)</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// Full receipt photo modal
function PhotoModal({ photo, onClose }: { photo: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-md max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <img src={photo} alt="Struk" className="rounded-xl max-h-[80vh] object-contain" />
        <Button
          size="icon"
          variant="secondary"
          className="absolute -top-2 -right-2 rounded-full shadow-lg"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function ScanFlow({ onDone }: { onDone: () => void }) {
  const { addTransaction, wallets, getWalletBalance, hideBalance } = useFinwise()
  const [step, setStep] = useState<Step>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [receiptThumb, setReceiptThumb] = useState<string | null>(null)
  const [showPhoto, setShowPhoto] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [walletId, setWalletId] = useState(wallets[0]?.id || 'cash')
  const fileRef = useRef<HTMLInputElement>(null)

  const MAX_RETRIES = 2

  async function processImage(image: string, isRetry = false, attempt = 0) {
    setError(null)
    setStep('scanning')
    setRetryCount(attempt)
    if (!isRetry) {
      setCapturedPhoto(image)
      // Generate compressed thumbnail in background
      compressToThumbnail(image, 200).then((thumb) => setReceiptThumb(thumb))
    }

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FinWise-Plan': loadPlan(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ image }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 401) throw new Error('Silakan login dulu untuk scan struk.')
        if (res.status === 403) throw new Error(data.error || 'Fitur Scan Struk AI hanya tersedia di paket Premium.')
        if (res.status === 429) throw new Error(data.error || 'Terlalu banyak scan. Tunggu sebentar.')
        if (res.status === 400) throw new Error(data.error || 'Gambar tidak valid.')
        throw new Error(data.error || 'Gagal membaca struk.')
      }

      const data = (await res.json()) as Partial<ScanResult> & { items?: ReceiptLineItem[] }
      const today = new Date().toISOString().slice(0, 10)
      const category =
        data.category && VALID_CATEGORIES.includes(data.category)
          ? data.category
          : 'shopping'

      // Auto-calculate total from items if amount is 0
      const items = data.items || []
      const itemsTotal = items.reduce((sum, it) => sum + it.price * (it.qty || 1), 0)
      const amount = Number(data.amount) || itemsTotal || 0

      setResult({
        store: data.store?.trim() || 'Struk Belanja',
        amount,
        category,
        date: data.date || today,
        items,
      })
      setRetryCount(0)
      setIsRetrying(false)
      setStep(items.length > 0 ? 'edit' : 'confirm')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca struk.'
      const permanent = msg.includes('login') || msg.includes('Premium') || msg.includes('Tunggu') || msg.includes('Gambar tidak valid')
      if (attempt < MAX_RETRIES && !permanent) {
        const nextAttempt = attempt + 1
        setRetryCount(nextAttempt)
        const delay = 1000 * Math.pow(2, attempt)
        window.setTimeout(() => processImage(image, true, nextAttempt), delay)
        return
      }
      setRetryCount(0)
      setError(msg)
      setIsRetrying(false)
      setStep('idle')
    }
  }

  /** Manual retry from error state */
  function handleRetry() {
    if (!capturedPhoto) return
    setRetryCount(0)
    setIsRetrying(true)
    setError(null)
    processImage(capturedPhoto, true)
  }

  async function handleCamera() {
    setError(null)
    const image = await getCameraPhoto()
    if (!image) return
    setRetryCount(0)
    await processImage(image)
  }

  async function handleGallery() {
    setError(null)
    const image = await getGalleryPhoto()
    if (!image) return
    setRetryCount(0)
    await processImage(image)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const image = await fileToDataUrl(file)
    if (fileRef.current) fileRef.current.value = ''
    setRetryCount(0)
    await processImage(image)
  }

  function handleUpdateItem(idx: number, item: ReceiptLineItem) {
    if (!result) return
    const newItems = [...result.items]
    newItems[idx] = item
    const newTotal = newItems.reduce((sum, it) => sum + it.price * (it.qty || 1), 0)
    setResult({ ...result, items: newItems, amount: newTotal })
  }

  function handleRemoveItem(idx: number) {
    if (!result) return
    const newItems = result.items.filter((_, i) => i !== idx)
    const newTotal = newItems.reduce((sum, it) => sum + it.price * (it.qty || 1), 0)
    setResult({ ...result, items: newItems, amount: newTotal })
  }

  function handleAddItem() {
    if (!result) return
    setResult({
      ...result,
      items: [...result.items, { name: '', price: 0 }],
    })
  }

  function save() {
    if (!result) return
    addTransaction({
      type: 'expense',
      category: result.category,
      amount: result.amount,
      description: result.store,
      date: result.date,
      walletId,
      receiptPhoto: capturedPhoto || undefined,
      receiptUrl: receiptThumb || undefined,
      items: result.items.length > 0 ? result.items : undefined,
    })
    onDone()
  }

  function reset() {
    setResult(null)
    setError(null)
    setCapturedPhoto(null)
    setReceiptThumb(null)
    setRetryCount(0)
    setIsRetrying(false)
    setStep('idle')
  }

  const native = isNative()

  return (
    <div className="flex flex-col gap-4">
      <StepBar current={step} />

      {/* Photo modal */}
      {showPhoto && capturedPhoto && (
        <PhotoModal photo={capturedPhoto} onClose={() => setShowPhoto(false)} />
      )}

      {/* ─── IDLE: capture ─── */}
      {step === 'idle' && (
        <>
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{error}</span>
                <div className="flex items-center gap-3 mt-2">
                  {capturedPhoto && !error.includes('login') && !error.includes('Tunggu') && (
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1 text-xs font-medium underline opacity-80 hover:opacity-100"
                    >
                      <RotateCcw className="size-3" /> Coba lagi
                    </button>
                  )}
                  <button
                    onClick={() => { setError(null) }}
                    className="text-xs underline opacity-80 hover:opacity-100"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-dashed border-primary/40 bg-surface-2/50 p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Receipt className="size-6 text-primary" />
            </div>
            <p className="mt-3 font-medium">Scan Struk Belanja</p>
            <p className="mt-1 text-sm text-muted-foreground text-balance">
              AI akan membaca item, harga, dan total secara otomatis.
            </p>
          </div>

          {/* Previously captured photo preview */}
          {capturedPhoto && (
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <ReceiptThumb photo={capturedPhoto} onView={() => setShowPhoto(true)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Foto tersimpan</p>
                <p className="text-xs text-muted-foreground">Foto struk akan disimpan bersama transaksi</p>
              </div>
            </div>
          )}

          {native ? (
            <>
              <Button onClick={handleCamera} className="h-12">
                <Camera className="size-5" /> Ambil Foto Struk
              </Button>
              <Button onClick={handleGallery} variant="secondary" className="h-12">
                <ImageIcon className="size-5" /> Pilih dari Galeri
              </Button>
            </>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                id="gallery-input"
              />
              <Button onClick={() => fileRef.current?.click()} className="h-12">
                <Camera className="size-5" /> Ambil Foto Struk
              </Button>
              <Button onClick={() => document.getElementById('gallery-input')?.click()} variant="secondary" className="h-12">
                <ImageIcon className="size-5" /> Pilih dari Galeri
              </Button>
            </>
          )}
        </>
      )}

      {/* ─── SCANNING: animated step indicators ─── */}
      {step === 'scanning' && (
        <>
          {retryCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
              <RotateCcw className="size-3 animate-spin" />
              <span>Mencoba ulang ({retryCount}/{MAX_RETRIES})…</span>
            </div>
          )}
          <ScanningSteps />
        </>
      )}

      {/* ─── EDIT: review items ─── */}
      {step === 'edit' && result && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-sm text-accent">
            <Sparkles className="size-4 shrink-0" />
            <span>Item terdeteksi! Periksa & sesuaikan sebelum simpan.</span>
          </div>

          {/* Store + photo row */}
          <div className="flex items-start gap-3">
            {capturedPhoto && (
              <ReceiptThumb photo={capturedPhoto} onView={() => setShowPhoto(true)} />
            )}
            <div className="flex-1 min-w-0">
              <Label htmlFor="scan-store" className="text-xs">Nama Toko</Label>
              <Input
                id="scan-store"
                value={result.store}
                onChange={(e) => setResult({ ...result, store: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Date */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="scan-date" className="text-xs">Tanggal</Label>
              <Input
                id="scan-date"
                type="date"
                value={result.date}
                onChange={(e) => setResult({ ...result, date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Items list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Item Struk ({result.items.length})</Label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3" /> Tambah
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Tidak ada item terdeteksi
                </p>
              ) : (
                result.items.map((item, i) => (
                  <ItemRow
                    key={i}
                    item={item}
                    index={i}
                    onUpdate={handleUpdateItem}
                    onRemove={handleRemoveItem}
                  />
                ))
              )}
            </div>
          </div>

          {/* Total */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold tabular-nums">{formatIDR(result.amount)}</span>
            </div>
            <Input
              inputMode="numeric"
              value={formatIDRInput(String(result.amount))}
              onChange={(e) => setResult({ ...result, amount: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              className="mt-2 h-8 text-right text-sm"
              placeholder="Edit total manual"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('confirm')}>
              Lewati <ChevronRight className="size-4" />
            </Button>
            <Button className="flex-1" onClick={() => setStep('confirm')}>
              <Check className="size-4" /> Lanjut
            </Button>
          </div>
        </div>
      )}

      {/* ─── CONFIRM: category + save ─── */}
      {step === 'confirm' && result && (
        <div className="flex flex-col gap-4">
          {/* Summary card */}
          <div className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
            {capturedPhoto && (
              <ReceiptThumb photo={capturedPhoto} onView={() => setShowPhoto(true)} />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{result.store}</p>
              <p className="text-xs text-muted-foreground">{result.date}</p>
              {result.items.length > 0 && (
                <p className="text-xs text-muted-foreground">{result.items.length} item</p>
              )}
            </div>
            <span className="text-lg font-bold tabular-nums">{formatIDR(result.amount)}</span>
          </div>

          {/* Edit back to items */}
          {result.items.length > 0 && (
            <button
              type="button"
              onClick={() => setStep('edit')}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Edit3 className="size-3.5" /> Edit item struk
            </button>
          )}

          {/* Category picker */}
          <div>
            <Label className="text-xs mb-2 block">Kategori</Label>
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

          {/* Wallet selector */}
          <div>
            <Label className="text-xs mb-2 block">📦 Ambil dari Dompet</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {wallets.map((w) => {
                const active = walletId === w.id
                const walletBalance = getWalletBalance(w.id)
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWalletId(w.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] transition-all duration-150 active:scale-95',
                      active
                        ? 'border-primary bg-primary/15 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <span className="text-base">
                      {w.logo || detectLogo(w.name)
                        ? <img src={w.logo || detectLogo(w.name)} alt="" className="w-5 h-5 object-contain" />
                        : w.icon
                      }
                    </span>
                    <span className="truncate font-medium">{w.name}</span>
                    <span className={cn(
                      'text-[10px] font-bold tabular-nums',
                      walletBalance > 0 ? 'text-emerald-600 dark:text-emerald-400'
                        : walletBalance < 0 ? 'text-destructive'
                        : 'text-muted-foreground'
                    )}>
                      {hideBalance ? '••••' : formatIDRShort(walletBalance)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Receipt photo status */}
          {capturedPhoto && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
              <CheckCircle2 className="size-4 text-green-500" />
              <span className="text-xs text-muted-foreground">
                Foto struk akan disimpan {receiptThumb ? '(thumbnail ~200KB)' : ''}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={reset}>
              <RotateCcw className="size-4" /> Ulang
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

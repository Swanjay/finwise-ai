'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Loader2, Check, X, Pencil, Keyboard, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { autoCategory, formatIDRInput, type TxType, type CategoryId, type Wallet } from '@/lib/finwise'

// ─── Types ───
export interface ParsedVoiceTransaction {
  type: TxType
  category: CategoryId
  amount: number
  note: string
  rawText: string
  walletId: string
}

interface VoiceInputProps {
  onResult: (parsed: ParsedVoiceTransaction) => void
  wallets: Wallet[]
}

// ─── Indonesian number parsing ───
const WORD_TO_NUM: Record<string, number> = {
  nol: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4,
  lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9,
  sepuluh: 10, sebelas: 11, belas: 10, puluh: 10,
  ratus: 100, seratus: 100,
  ribu: 1_000, seribu: 1_000,
  juta: 1_000_000, sejuta: 1_000_000,
  miliar: 1_000_000_000,
}

function parseNumericToken(tok: string): number | null {
  const cleaned = tok.replace(/[.,]/g, '')
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10)
  const m = tok.match(/^(\d+[.,]?\d*)\s*(rb|ribu|k|jt|juta|m)$/i)
  if (m) {
    const base = parseFloat(m[1].replace(',', '.'))
    const unit = m[2].toLowerCase()
    if (unit === 'rb' || unit === 'ribu' || unit === 'k') return Math.round(base * 1_000)
    if (unit === 'jt' || unit === 'juta') return Math.round(base * 1_000_000)
    if (unit === 'm') return Math.round(base * 1_000_000)
  }
  const m2 = tok.match(/^(\d+)(rb|jt)$/i)
  if (m2) {
    const base = parseInt(m2[1], 10)
    return m2[2].toLowerCase() === 'rb' ? base * 1_000 : base * 1_000_000
  }
  return null
}

function parseIndonesianWords(text: string): number | null {
  const words = text.toLowerCase().split(/\s+/)
  let total = 0, current = 0, found = false

  for (const w of words) {
    if (WORD_TO_NUM[w] === undefined) continue
    found = true
    const val = WORD_TO_NUM[w]

    if (w === 'sejuta') { total += 1_000_000; current = 0 }
    else if (w === 'seribu') { total += 1_000; current = 0 }
    else if (w === 'seratus') { total += 100; current = 0 }
    else if (w === 'sebelas') { current = (current || 0) + 11 }
    else if (w === 'sepuluh') { current = (current || 0) + 10 }
    else if (val >= 1_000) { total += (current || 1) * val; current = 0 }
    else if (val === 100) { total += (current || 1) * val; current = 0 }
    else if (val === 10) { current = current > 0 ? current * val : val }
    else { current = (current || 0) + val }
  }
  return found ? total + current : null
}

function extractAmount(text: string): { amount: number; remaining: string } {
  const tokens = text.split(/\s+/)
  const remaining: string[] = []
  let amount = 0

  for (let i = 0; i < tokens.length; i++) {
    const num = parseNumericToken(tokens[i])
    if (num !== null) { amount += num; continue }

    if (WORD_TO_NUM[tokens[i].toLowerCase()] !== undefined) {
      const start = i
      let chunk = tokens[i]
      while (i + 1 < tokens.length && WORD_TO_NUM[tokens[i + 1]?.toLowerCase()] !== undefined) {
        chunk += ' ' + tokens[++i]
      }
      const parsed = parseIndonesianWords(chunk)
      if (parsed && parsed > 0) { amount += parsed; continue }
      for (let j = start; j <= i; j++) remaining.push(tokens[j])
      continue
    }
    remaining.push(tokens[i])
  }
  return { amount, remaining: remaining.join(' ') }
}

function detectType(text: string): TxType {
  const lower = text.toLowerCase()
  const incomeKw = ['masuk', 'terima', 'gaji', 'gajian', 'pemasukan', 'bonus', 'thr', 'dividen', 'bunga', 'refund', 'cashback', 'komisi', 'upah', 'pendapatan']
  for (const kw of incomeKw) { if (lower.includes(kw)) return 'income' }
  return 'expense'
}

function cleanDescription(text: string): string {
  let c = text.replace(/^(bayar|beli|belanja|untuk|ke|di|ke\s+)\s+/gi, '')
  c = c.replace(/\d+[.,]?\d*\s*(rb|ribu|jt|juta|rupiah|rp)\b/gi, '')
  c = c.replace(/\d+[.,]?\d*/g, '')
  const nw = Object.keys(WORD_TO_NUM).join('|')
  c = c.replace(new RegExp(`\\b(${nw})\\b`, 'gi'), '')
  return c.replace(/\s+/g, ' ').trim() || text.trim()
}

function parseVoiceText(text: string, wallets: Wallet[]): ParsedVoiceTransaction {
  const type = detectType(text)
  const { amount, remaining } = extractAmount(text)
  const description = cleanDescription(remaining || text)
  const category = autoCategory(description)
  const walletId = detectWallet(text, wallets) || wallets[0]?.id || 'cash'
  return { type, category, amount, note: description || text.trim(), rawText: text, walletId }
}

// ─── Category labels ───
const CATEGORY_LABELS: Record<string, string> = {
  food: '🍔 Makanan', transport: '🚗 Transport', shopping: '🛍️ Belanja',
  entertainment: '🎮 Hiburan', bills: '📋 Tagihan', health: '💊 Kesehatan',
  education: '📚 Pendidikan', internet: '📶 Internet', savings: '💰 Tabungan',
  salary: '💵 Gaji', transfer: '🔄 Transfer', other: '📦 Lainnya',
}

// ─── Wallet detection ───
function detectWallet(text: string, wallets: Wallet[]): string | null {
  const lower = text.toLowerCase()
  for (const w of wallets) {
    const name = w.name.toLowerCase()
    // exact word match or partial
    if (lower.includes(name)) return w.id
    // also match common abbreviations
    if (name === 'bank central asia' && lower.includes('bca')) return w.id
    if (name === 'bank mandiri' && lower.includes('mandiri')) return w.id
    if (name === 'bank rakyat indonesia' && lower.includes('bri')) return w.id
    if (name === 'bank negara indonesia' && lower.includes('bni')) return w.id
    if (name === 'gopay' && (lower.includes('gopay') || lower.includes('go pay'))) return w.id
    if (name === 'ovo' && lower.includes('ovo')) return w.id
    if (name === 'dana' && lower.includes('dana')) return w.id
    if (name === 'shopeepay' && (lower.includes('shopeepay') || lower.includes('shopee pay'))) return w.id
    if (name === 'tunai' && (lower.includes('tunai') || lower.includes('cash'))) return w.id
  }
  return null
}

// ─── Main Component ───
export default function VoiceInput({ onResult, wallets }: VoiceInputProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text')
  const [inputText, setInputText] = useState('')
  const [state, setState] = useState<'idle' | 'recording' | 'processing' | 'confirm'>('idle')
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState<ParsedVoiceTransaction | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState<{ type: TxType; category: CategoryId; amount: string; note: string; walletId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallets[0]?.id || 'cash')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Smart text parsing ──
  const handleTextParse = useCallback(() => {
    if (!inputText.trim()) return
    setError(null)
    const result = parseVoiceText(inputText.trim(), wallets)
    setTranscript(inputText.trim())
    setParsed(result)
    setSelectedWalletId(result.walletId)
    setEditValues({
      type: result.type,
      category: result.category,
      amount: result.amount > 0 ? result.amount.toString() : '',
      note: result.note,
      walletId: result.walletId,
    })
    // If no amount detected, auto-open edit mode
    setIsEditing(result.amount <= 0)
    setState('confirm')
  }, [inputText])

  // ── Voice recording ──
  const startRecording = useCallback(async () => {
    setError(null); setTranscript(''); setParsed(null); setIsEditing(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        await sendToTranscribe(blob)
      }
      recorderRef.current = recorder
      recorder.start(100)
      setState('recording')
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000)
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setError('Akses mikrofon ditolak. Izinkan di pengaturan browser.')
      else setError(`Gagal akses mikrofon: ${err.message}`)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
      setState('processing')
    }
  }, [])

  const sendToTranscribe = useCallback(async (blob: Blob) => {
    setState('processing')
    try {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      const res = await fetch('/api/ai/voice-transcribe', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.text) {
        setError(data.error || 'Transkrip gagal. Coba ketik manual.')
        setState('idle')
        setMode('text')
        return
      }
      setTranscript(data.text)
      const result = parseVoiceText(data.text, wallets)
      setParsed(result)
      setSelectedWalletId(result.walletId)
      setEditValues({ type: result.type, category: result.category, amount: result.amount > 0 ? result.amount.toString() : '', note: result.note, walletId: result.walletId })
      setIsEditing(result.amount <= 0)
      setState('confirm')
    } catch (err: any) {
      setError(`Gagal mengirim audio: ${err.message}. Coba ketik manual.`)
      setState('idle')
      setMode('text')
    }
  }, [wallets])

  const handleConfirm = useCallback(() => {
    if (!parsed) return
    if (isEditing && editValues) {
      const amount = parseInt(editValues.amount.replace(/\D/g, ''), 10) || 0
      if (amount <= 0) { setError('Nominal harus lebih dari 0'); return }
      onResult({ type: editValues.type, category: editValues.category, amount, note: editValues.note || parsed.note, rawText: parsed.rawText, walletId: selectedWalletId })
    } else {
      if (parsed.amount <= 0) { setError('Nominal tidak terdeteksi. Silakan edit.'); setIsEditing(true); return }
      onResult({ ...parsed, walletId: selectedWalletId })
    }
  }, [parsed, isEditing, editValues, onResult, selectedWalletId])

  const handleRetry = useCallback(() => {
    setInputText(''); setTranscript(''); setParsed(null); setError(null); setIsEditing(false)
    setEditValues(null); setState('idle')
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      {state === 'idle' && (
        <div className="flex gap-2 rounded-xl bg-muted/30 p-1">
          <button
            onClick={() => setMode('text')}
            className={cn('flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition',
              mode === 'text' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
            <Keyboard className="size-4" /> Ketik
          </button>
          <button
            onClick={() => setMode('voice')}
            className={cn('flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition',
              mode === 'voice' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
            <Mic className="size-4" /> Suara
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive">
          ⚠️ {error}
        </div>
      )}

      {/* ─── TEXT MODE ─── */}
      {state === 'idle' && mode === 'text' && (
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Ketik transaksi Anda</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextParse()}
                placeholder="bayar makan 50 ribu"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
              <button
                onClick={handleTextParse}
                disabled={!inputText.trim()}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 transition active:scale-95"
              >
                <Sparkles className="size-4" />
              </button>
            </div>
          </div>

          {/* Examples */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
            <p className="text-xs font-semibold text-primary mb-2">💡 Contoh input:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'bayar makan 50 ribu',
                'beli pulsa 100rb',
                'gaji bulanan 5 juta',
                'terima bonus 1.500.000',
                'bayar listrik 200rb',
                'belanja bulanan 500 ribu',
              ].map(ex => (
                <button
                  key={ex}
                  onClick={() => setInputText(ex)}
                  className="rounded-full bg-card border border-border/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── VOICE MODE ─── */}
      {state === 'idle' && mode === 'voice' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <button
            onClick={startRecording}
            className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-primary text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            style={{ boxShadow: '0 8px 32px rgba(46,173,75,0.3)' }}
          >
            <Mic className="size-8" />
          </button>
          <p className="text-xs text-muted-foreground">Tap untuk mulai rekam</p>
          <p className="text-[10px] text-muted-foreground/60 text-center max-w-[240px]">
            Rekam suara lalu sistem akan mentranskrip. Jika gagal, silakan ketik manual.
          </p>
        </div>
      )}

      {/* ─── RECORDING ─── */}
      {state === 'recording' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" style={{ animationDuration: '1.5s' }} />
            <button onClick={stopRecording}
              className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg active:scale-95 transition-transform">
              <MicOff className="size-8" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm font-medium text-red-500">Merekam {formatTime(recordingTime)}</p>
          </div>
          <p className="text-xs text-muted-foreground">Tap untuk stop & proses</p>
        </div>
      )}

      {/* ─── PROCESSING ─── */}
      {state === 'processing' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Mentranskrip suara...</p>
        </div>
      )}

      {/* ─── CONFIRM ─── */}
      {state === 'confirm' && (
        <div className="flex flex-col gap-3">
          {/* Transcript */}
          {transcript && (
            <div className="rounded-xl bg-muted/30 border border-border/30 px-4 py-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">🎤 Terdeteksi:</p>
              <p className="text-sm italic text-foreground/80">&quot;{transcript}&quot;</p>
            </div>
          )}

          {/* Parsed result card */}
          {parsed && (
            <div className={cn(
              'rounded-xl border-2 p-4 transition-colors',
              parsed.type === 'income' ? 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
                : 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10',
            )}>
              {isEditing && editValues ? (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    {(['expense', 'income'] as TxType[]).map(t => (
                      <button key={t} onClick={() => setEditValues(v => v ? { ...v, type: t } : v)}
                        className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition',
                          editValues.type === t ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>
                        {t === 'expense' ? '💸 Keluar' : '💰 Masuk'}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nominal (Rp)</label>
                    <input type="text" inputMode="numeric" value={editValues.amount}
                      onChange={e => setEditValues(v => v ? { ...v, amount: e.target.value.replace(/\D/g, '') } : v)}
                      placeholder="50000"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Kategori</label>
                    <select value={editValues.category}
                      onChange={e => setEditValues(v => v ? { ...v, category: e.target.value } : v)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                      {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Catatan</label>
                    <input type="text" value={editValues.note}
                      onChange={e => setEditValues(v => v ? { ...v, note: e.target.value } : v)}
                      placeholder="Deskripsi transaksi"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Dari Dompet</label>
                    <select value={selectedWalletId}
                      onChange={e => setSelectedWalletId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      parsed.type === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                      {parsed.type === 'income' ? '⬆️ Pemasukan' : '⬇️ Pengeluaran'}
                    </span>
                    <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[parsed.category] || parsed.category}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {parsed.type === 'income' ? '+' : '-'}Rp {parsed.amount.toLocaleString('id-ID')}
                  </p>
                  <p className="text-sm text-muted-foreground">{parsed.note}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-muted-foreground">💳</span>
                    <select value={selectedWalletId}
                      onChange={e => setSelectedWalletId(e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted-foreground cursor-pointer">
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.icon} {w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-muted py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/80 transition">
              <X className="size-4" /> Ulangi
            </button>
            {parsed && (
              <button onClick={() => setIsEditing(v => !v)}
                className={cn('flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition',
                  isEditing ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                <Pencil className="size-4" /> {isEditing ? 'Preview' : 'Edit'}
              </button>
            )}
            <button onClick={handleConfirm}
              className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-primary py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition active:scale-[0.98]">
              <Check className="size-4" /> Simpan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

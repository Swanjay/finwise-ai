'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Loader2, Check, X, Pencil, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { autoCategory, type TxType, type CategoryId } from '@/lib/finwise'

// ─── Types ───
export interface ParsedVoiceTransaction {
  type: TxType
  category: CategoryId
  amount: number
  note: string
  rawText: string
}

interface VoiceInputProps {
  onResult: (parsed: ParsedVoiceTransaction) => void
}

// ─── Indonesian number word maps ───
const WORD_TO_NUM: Record<string, number> = {
  nol: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4,
  lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9,
  sepuluh: 10, sebelas: 11, belas: 10, puluh: 10,
  ratus: 100, seratus: 100,
  ribu: 1_000, seribu: 1_000,
  juta: 1_000_000, sejuta: 1_000_000,
  miliar: 1_000_000_000,
}

// ─── Parse written numbers: "50000", "50.000", "50rb", "50k", "50 ribu" ───
function parseNumericToken(tok: string): number | null {
  // Remove dots/commas used as thousand separators: "50.000" → "50000"
  const cleaned = tok.replace(/[.,]/g, '')
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10)
  // "50rb", "50k", "5jt", "5m"
  const m = tok.match(/^(\d+[.,]?\d*)\s*(rb|ribu|k|jt|juta|m)$/i)
  if (m) {
    const base = parseFloat(m[1].replace(',', '.'))
    const unit = m[2].toLowerCase()
    if (unit === 'rb' || unit === 'ribu' || unit === 'k') return Math.round(base * 1_000)
    if (unit === 'jt' || unit === 'juta') return Math.round(base * 1_000_000)
    if (unit === 'm') return Math.round(base * 1_000_000)
  }
  // "150rb" without space
  const m2 = tok.match(/^(\d+)(rb|jt)$/i)
  if (m2) {
    const base = parseInt(m2[1], 10)
    const unit = m2[2].toLowerCase()
    if (unit === 'rb') return base * 1_000
    if (unit === 'jt') return base * 1_000_000
  }
  return null
}

// ─── Parse Indonesian words: "lima puluh ribu" → 50000 ───
function parseIndonesianWords(text: string): number | null {
  const words = text.toLowerCase().split(/\s+/)
  let total = 0
  let current = 0
  let found = false

  for (const w of words) {
    if (WORD_TO_NUM[w] !== undefined) {
      found = true
      const val = WORD_TO_NUM[w]

      if (w === 'se' || w === 'satu' || w === 'sejuta' || w === 'seribu' || w === 'seratus' || w === 'sebelas' || w === 'sepuluh') {
        // Special prefixes
        if (w === 'sejuta') { current += 1_000_000; total += current; current = 0 }
        else if (w === 'seribu') { current += 1_000; total += current; current = 0 }
        else if (w === 'seratus') { current += 100; total += current; current = 0 }
        else if (w === 'sebelas') { current = (current || 0) + 11 }
        else if (w === 'sepuluh') { current = (current || 0) + 10 }
        else { current = (current || 0) + val }
      } else if (val === 1_000_000_000) {
        current = (current || 1) * val; total += current; current = 0
      } else if (val === 1_000_000) {
        current = (current || 1) * val; total += current; current = 0
      } else if (val === 1_000) {
        current = (current || 1) * val; total += current; current = 0
      } else if (val === 100) {
        current = (current || 1) * val; total += current; current = 0
      } else if (val === 10) {
        if (current > 0) { current *= val } else { current = val }
      } else {
        current = (current || 0) + val
      }
    }
  }

  if (!found) return null
  return total + current
}

// ─── Extract amount from mixed text ───
function extractAmount(text: string): { amount: number; remaining: string } {
  const tokens = text.split(/\s+/)
  let remaining: string[] = []
  let amount = 0

  for (let i = 0; i < tokens.length; i++) {
    const num = parseNumericToken(tokens[i])
    if (num !== null) {
      amount += num
      continue
    }
    // Check if this word is an Indonesian number word
    if (WORD_TO_NUM[tokens[i].toLowerCase()] !== undefined) {
      // Try to parse a chunk of consecutive number words
      let chunk = tokens[i]
      let j = i + 1
      while (j < tokens.length && WORD_TO_NUM[tokens[j].toLowerCase()] !== undefined) {
        chunk += ' ' + tokens[j]
        j++
      }
      const parsed = parseIndonesianWords(chunk)
      if (parsed && parsed > 0) {
        amount += parsed
        i = j - 1
        continue
      }
    }
    remaining.push(tokens[i])
  }

  return { amount, remaining: remaining.join(' ') }
}

// ─── Detect transaction type from text ───
function detectType(text: string): TxType {
  const lower = text.toLowerCase()
  const incomeKeywords = [
    'masuk', 'terima', 'gaji', 'gajian', 'pemasukan', 'bonus', 'THR',
    'dividen', 'bunga', 'refund', 'cashback', 'komisi', 'upah',
    'pendapatan', 'hasil', 'transfer masuk', 'duit masuk',
  ]
  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) return 'income'
  }
  return 'expense'
}

// ─── Clean up description from amount/type keywords ───
function cleanDescription(text: string): string {
  let clean = text
  // Remove common filler words at start
  clean = clean.replace(/^(bayar|beli|belanja|untuk|ke|di|ke\s+)\s+/gi, '')
  // Remove amount-like tokens
  clean = clean.replace(/\d+[.,]?\d*\s*(rb|ribu|jt|juta|rupiah|rp)\b/gi, '')
  clean = clean.replace(/\d+[.,]?\d*/g, '')
  // Remove Indonesian number words that are amounts
  const numWords = Object.keys(WORD_TO_NUM).join('|')
  clean = clean.replace(new RegExp(`\\b(${numWords})\\b`, 'gi'), '')
  // Clean up extra spaces
  clean = clean.replace(/\s+/g, ' ').trim()
  return clean || text.trim()
}

// ─── Full parse ───
function parseVoiceText(text: string): ParsedVoiceTransaction {
  const type = detectType(text)
  const { amount, remaining } = extractAmount(text)
  const description = cleanDescription(remaining || text)
  const category = autoCategory(description)

  return {
    type,
    category,
    amount,
    note: description || text.trim(),
    rawText: text,
  }
}

// ─── Category label map ───
const CATEGORY_LABELS: Record<string, string> = {
  food: '🍔 Makanan',
  transport: '🚗 Transport',
  shopping: '🛍️ Belanja',
  entertainment: '🎮 Hiburan',
  bills: '📋 Tagihan',
  health: '💊 Kesehatan',
  education: '📚 Pendidikan',
  internet: '📶 Internet',
  savings: '💰 Tabungan',
  salary: '💵 Gaji',
  transfer: '🔄 Transfer',
  other: '📦 Lainnya',
}

function formatIDR(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

// ─── Speech Recognition types ───
interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
  message?: string
}

// ─── Component ───
export default function VoiceInput({ onResult }: VoiceInputProps) {
  const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'confirm'>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [parsed, setParsed] = useState<ParsedVoiceTransaction | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState<{
    type: TxType
    category: CategoryId
    amount: string
    note: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Check browser support
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setIsSupported(false)
      setError('Browser tidak mendukung Speech Recognition. Coba pakai Chrome atau Edge.')
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const startListening = useCallback(async () => {
    setError(null)
    setTranscript('')
    setInterimText('')
    setParsed(null)
    setIsEditing(false)

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setIsSupported(false)
      setError('Browser tidak mendukung Speech Recognition.')
      return
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recognition = new SR()
      recognition.lang = 'id-ID'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setState('listening')
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = ''
        let interimText = ''

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalText += result[0].transcript + ' '
          } else {
            interimText += result[0].transcript
          }
        }

        if (finalText) setTranscript(prev => (prev + finalText).trim())
        setInterimText(interimText)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech') {
          setError('Tidak ada suara terdeteksi. Coba lagi.')
        } else if (event.error === 'not-allowed') {
          setError('Akses mikrofon ditolak. Izinkan akses mikrofon di pengaturan browser.')
        } else if (event.error === 'network') {
          setError('Koneksi internet bermasalah. Coba lagi.')
        } else {
          setError(`Error: ${event.error}`)
        }
        setState('idle')
        stopListening()
      }

      recognition.onend = () => {
        // Auto-process when recognition ends
        const finalText = (transcript || '').trim()
        if (finalText.length > 0) {
          processText(finalText)
        } else {
          setState('idle')
        }
        // Stop mic stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop())
          streamRef.current = null
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Akses mikrofon ditolak. Izinkan di pengaturan browser.')
      } else {
        setError(`Gagal mengakses mikrofon: ${err.message}`)
      }
      setState('idle')
    }
  }, [transcript])

  const stopAndProcess = useCallback(() => {
    setState('processing')
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    // onend will trigger processText
    // But also try immediate process as fallback
    setTimeout(() => {
      const text = transcript.trim()
      if (text.length > 0 && state !== 'confirm') {
        processText(text)
      }
    }, 500)
  }, [transcript, state])

  const processText = useCallback((text: string) => {
    const result = parseVoiceText(text)
    setParsed(result)
    setEditValues({
      type: result.type,
      category: result.category,
      amount: result.amount > 0 ? result.amount.toString() : '',
      note: result.note,
    })
    setState('confirm')
  }, [])

  const handleConfirm = useCallback(() => {
    if (!parsed) return

    if (isEditing && editValues) {
      const amount = parseInt(editValues.amount.replace(/\D/g, ''), 10) || 0
      if (amount <= 0) {
        setError('Nominal harus lebih dari 0')
        return
      }
      onResult({
        type: editValues.type,
        category: editValues.category,
        amount,
        note: editValues.note || parsed.note,
        rawText: parsed.rawText,
      })
    } else {
      if (parsed.amount <= 0) {
        setError('Gagal mendeteksi nominal. Silakan edit manual.')
        setIsEditing(true)
        return
      }
      onResult(parsed)
    }
  }, [parsed, isEditing, editValues, onResult])

  const handleRetry = useCallback(() => {
    setTranscript('')
    setInterimText('')
    setParsed(null)
    setError(null)
    setIsEditing(false)
    setState('idle')
  }, [])

  // ─── Render ───
  return (
    <div className="flex flex-col gap-4">
      {/* Error */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive">
          ⚠️ {error}
        </div>
      )}

      {/* Not supported */}
      {!isSupported && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          🚫 Browser ini tidak mendukung Voice Input. Silakan gunakan <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong> di device yang sama.
        </div>
      )}

      {/* ─── STATE: IDLE ─── */}
      {state === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Ucapkan transaksi Anda, contoh:
            </p>
            <p className="text-xs text-muted-foreground/70 italic">
              &quot;Bayar makan siang lima puluh ribu&quot;
            </p>
          </div>

          <button
            onClick={startListening}
            disabled={!isSupported}
            className={cn(
              'flex size-20 items-center justify-center rounded-full transition-all duration-300',
              isSupported
                ? 'bg-gradient-to-br from-green-400 to-primary text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
            style={{ boxShadow: isSupported ? '0 8px 32px rgba(46,173,75,0.3)' : undefined }}
          >
            <Mic className="size-8" />
          </button>

          <p className="text-xs text-muted-foreground">
            {isSupported ? 'Tap untuk mulai bicara' : 'Voice input tidak tersedia'}
          </p>
        </div>
      )}

      {/* ─── STATE: LISTENING ─── */}
      {state === 'listening' && (
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Listening indicator */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '1.5s' }} />
            <button
              onClick={stopAndProcess}
              className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg hover:shadow-xl transition-transform active:scale-95"
            >
              <MicOff className="size-8" />
            </button>
          </div>

          <p className="text-sm font-medium text-primary animate-pulse">
            🎙️ Mendengarkan...
          </p>

          {/* Live transcript */}
          <div className="w-full rounded-xl bg-muted/50 border border-border/50 px-4 py-3 min-h-[60px]">
            <p className="text-sm text-foreground">
              {transcript}
              {interimText && (
                <span className="text-muted-foreground/60 italic">{interimText}</span>
              )}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Tap tombol merah untuk stop & proses
          </p>
        </div>
      )}

      {/* ─── STATE: PROCESSING ─── */}
      {state === 'processing' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Memproses...</p>
        </div>
      )}

      {/* ─── STATE: CONFIRM ─── */}
      {state === 'confirm' && parsed && (
        <div className="flex flex-col gap-3">
          {/* Raw transcript */}
          <div className="rounded-xl bg-muted/30 border border-border/30 px-4 py-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">🎤 Terdeteksi:</p>
            <p className="text-sm italic text-foreground/80">&quot;{parsed.rawText}&quot;</p>
          </div>

          {/* Parsed result card */}
          <div className={cn(
            'rounded-xl border-2 p-4 transition-colors',
            parsed.type === 'income'
              ? 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
              : 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10',
          )}>
            {isEditing && editValues ? (
              /* ── Edit mode ── */
              <div className="flex flex-col gap-3">
                {/* Type toggle */}
                <div className="flex gap-2">
                  {(['expense', 'income'] as TxType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setEditValues(v => v ? { ...v, type: t } : v)}
                      className={cn(
                        'flex-1 rounded-lg py-2 text-sm font-semibold transition',
                        editValues.type === t
                          ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {t === 'expense' ? '💸 Pengeluaran' : '💰 Pemasukan'}
                    </button>
                  ))}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nominal (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editValues.amount}
                    onChange={e => setEditValues(v => v ? { ...v, amount: e.target.value.replace(/\D/g, '') } : v)}
                    placeholder="50000"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Kategori</label>
                  <select
                    value={editValues.category}
                    onChange={e => setEditValues(v => v ? { ...v, category: e.target.value } : v)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Catatan</label>
                  <input
                    type="text"
                    value={editValues.note}
                    onChange={e => setEditValues(v => v ? { ...v, note: e.target.value } : v)}
                    placeholder="Deskripsi transaksi"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              /* ── Display mode ── */
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    parsed.type === 'income'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  )}>
                    {parsed.type === 'income' ? '⬆️ Pemasukan' : '⬇️ Pengeluaran'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[parsed.category] || parsed.category}
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  {parsed.type === 'income' ? '+' : '-'}{formatIDR(parsed.amount)}
                </p>
                <p className="text-sm text-muted-foreground">{parsed.note}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-muted py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/80 transition"
            >
              <X className="size-4" />
              Ulangi
            </button>
            <button
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false)
                } else {
                  setIsEditing(true)
                }
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition',
                isEditing
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              <Pencil className="size-4" />
              {isEditing ? 'Preview' : 'Edit'}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-primary py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition active:scale-[0.98]"
            >
              <Check className="size-4" />
              Simpan
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      {state === 'idle' && isSupported && (
        <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
          <p className="text-xs font-semibold text-primary mb-2">💡 Tips Voice Input:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• &quot;Bayar makan <strong>50 ribu</strong>&quot;</li>
            <li>• &quot;Beli pulsa <strong>100rb</strong>&quot;</li>
            <li>• &quot;Gaji bulanan <strong>5 juta</strong>&quot;</li>
            <li>• &quot;Bayar listrik <strong>dua ratus ribu</strong>&quot;</li>
            <li>• &quot;Terima bonus <strong>1.500.000</strong>&quot;</li>
          </ul>
        </div>
      )}
    </div>
  )
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { scanReceiptSchema } from '@/lib/validate'
import { getUserPlan } from '@/lib/plans-server'
import { createHash } from 'crypto'

function emailToUserId(email: string): string {
  const hash = createHash('md5').update(email.toLowerCase().trim()).digest('hex')
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`
}

export const maxDuration = 30

const CATEGORY_IDS = [
  'food', 'transport', 'shopping', 'entertainment',
  'bills', 'health', 'education', 'internet',
] as const
type CategoryId = typeof CATEGORY_IDS[number]

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || 'unknown'
}

// Category detection keywords (Indonesian)
const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  food: ['makan', 'minum', 'kopi', 'teh', 'nasi', 'mie', 'ayam', 'ikan', 'sate', 'bakso',
    'warung', 'restoran', 'cafe', 'kantin', 'food', 'rm', 'rumah makan', 'padang', 'soto',
    'bakmie', 'kwetiau', 'roti', 'donat', 'kue', 'jus', 'es', 'snack', 'cemilan'],
  transport: ['bensin', 'pertalite', 'pertamax', 'spbu', 'parkir', 'tol', 'grab', 'gojek',
    'ojol', 'taxi', 'transjakarta', 'mrt', 'krl', 'bus', 'angkutan'],
  shopping: ['supermarket', 'Indomaret', 'Alfamart', 'Alfamidi', 'Circle K', 'lawson',
    'hypermart', 'carrefour', 'hermindo', 'lulu', 'trans mart', 'belanja', 'toko'],
  entertainment: ['bioskop', 'cinema', 'netflix', 'spotify', 'game', 'steam', 'gopay',
    'ovo', 'dana', 'hiburan', 'nonton', 'konser'],
  bills: ['listrik', 'pln', 'air', 'pdam', 'telkom', 'indihome', 'telepon', 'bpjs',
    'pajak', 'rekening', 'tagihan'],
  health: ['obat', 'apotek', 'apotik', 'kimia farma', 'k24', 'dokter', 'klinik',
    'rs', 'rumah sakit', 'vitamin', 'suplemen'],
  education: ['buku', 'sekolah', 'kuliah', 'kursus', 'les', 'tutorial', 'udemy'],
  internet: ['pulsa', 'token', 'listrik', 'data', 'internet', 'wifi', 'kuota', 'xl',
    'telkomsel', 'indosat', 'tri', 'axis'],
}

// Extract individual line items from receipt text
function extractItems(text: string): { name: string; price: number; qty?: number }[] {
  const items: { name: string; price: number; qty?: number }[] = []
  const lines = text.split('\n')

  // Pattern: "Item Name  2 x 15.000" or "Item Name  15.000" or "Item Name   Rp 15.000"
  const itemPatterns = [
    /^(.+?)\s+(\d+)\s*[xX×]\s*(?:Rp\.?\s*)?([\d.,]+)\s*$/,
    /^(.+?)\s+(?:Rp\.?\s*)?([\d.,]+)\s*$/,
  ]

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 3) continue

    // Skip header/footer/total lines
    const skip = /total|subtotal|bayar|payment|tunai|cash|kartu|card|kembali|change|ppn|pajak|tax|diskon|discount|member|poin|point/i
    if (skip.test(trimmed)) continue

    // Try pattern with qty
    const qtyMatch = trimmed.match(itemPatterns[0])
    if (qtyMatch) {
      const name = qtyMatch[1].trim()
      const qty = parseInt(qtyMatch[2])
      const price = parseInt(qtyMatch[3].replace(/[.,]/g, ''))
      if (name.length >= 2 && price > 0 && price < 10_000_000 && qty > 0 && qty < 100) {
        items.push({ name, price, qty })
        continue
      }
    }

    // Try pattern without qty
    const simpleMatch = trimmed.match(itemPatterns[1])
    if (simpleMatch) {
      const name = simpleMatch[1].trim()
      const price = parseInt(simpleMatch[2].replace(/[.,]/g, ''))
      if (name.length >= 2 && price > 100 && price < 10_000_000) {
        items.push({ name, price })
      }
    }
  }

  return items
}

// Extract amount from OCR text
function normalizeAmount(raw: string): number {
  const num = parseInt(raw.replace(/[^\d]/g, ''))
  return Number.isFinite(num) && num > 0 && num < 100_000_000 ? num : 0
}

function extractAmount(text: string): number {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const totalLinePatterns = [
    /(?:grand\s*total|total\s*belanja|total\s*pembayaran|total\s*due|total\s*amount|jumlah\s*bayar|total)\D{0,20}(\d{1,3}(?:[.,]\d{3})+|\d{4,})/i,
    /(?:bayar|payment|amount)\D{0,20}(\d{1,3}(?:[.,]\d{3})+|\d{4,})/i,
  ]

  for (const pattern of totalLinePatterns) {
    for (const line of lines) {
      const m = line.match(pattern)
      if (m) {
        const amount = normalizeAmount(m[1])
        if (amount) return amount
      }
    }
  }

  const itemTotal = extractItems(text).reduce((sum, item) => sum + item.price * (item.qty || 1), 0)
  if (itemTotal > 0) return itemTotal

  const fallback = text.match(/(?:Rp|IDR)\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,})/gi)
  if (fallback) {
    const nums = fallback.map(f => normalizeAmount(f)).filter(n => n > 1000 && n < 100_000_000)
    if (nums.length > 0) return Math.max(...nums)
  }

  return 0
}

// Detect store name from OCR text
function extractStore(text: string): string {
  const storePatterns = [
    /(?:tok|store|merchant|outlet|branch)[:\s]+([A-Z][\w\s]+?)(?:\n|$)/i,
    /^(?:PT|CV|TB|UD|Toko|Rumah Makan|Restoran|Cafe)\s+([\w\s]+?)(?:\n|$)/im,
    /^([A-Z][\w\s]*(?:Mart|Store|Shop|Mall|Plaza))/im,
    /^([\w\s]*(?:Indomaret|Alfamart|Alfamidi|Circle K|Lawson|Hypermart|Carrefour|Transmart))/im,
  ]

  for (const pattern of storePatterns) {
    const match = text.match(pattern)
    if (match) {
      const name = (match[1] || match[0]).trim()
      if (name.length > 2 && name.length < 50) return name
    }
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && l.length < 50)
  if (lines.length > 0) return lines[0]

  return 'Struk Belanja'
}

// Detect category from OCR text
function detectCategory(text: string): CategoryId {
  const lower = text.toLowerCase()
  let bestCategory: CategoryId = 'shopping'
  let bestScore = 0

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [CategoryId, string[]][]) {
    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestCategory = cat
    }
  }

  return bestCategory
}

// Extract date from OCR text
function extractDate(text: string): string {
  const today = new Date().toISOString().slice(0, 10)

  const datePatterns = [
    /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
    /(\d{1,2})\s*(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\w*\s*(\d{4})/i,
    /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*(\d{4})/i,
  ]

  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
    jul: '07', agu: '08', sep: '09', okt: '10', nov: '11', des: '12',
    may: '05', aug: '08', oct: '10', dec: '12',
  }

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      try {
        if (pattern === datePatterns[0]) {
          const [, y, m, d] = match
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        } else if (pattern === datePatterns[1]) {
          const [, d, m, y] = match
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        } else {
          const [, d, mon, y] = match
          const m = months[mon.toLowerCase().slice(0, 3)] || '01'
          return `${y}-${m}-${d.padStart(2, '0')}`
        }
      } catch {}
    }
  }

  return today
}

// Use OCR.space free API to extract text from image
async function ocrSpace(imageDataUrl: string): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) throw new Error('OCR_SPACE_API_KEY not configured in environment variables')

  // Use base64image parameter (simpler, more reliable)
  const formData = new URLSearchParams()
  formData.append('apikey', apiKey)
  formData.append('base64image', imageDataUrl)
  formData.append('language', 'eng') // English for better receipt parsing
  formData.append('isOverlayRequired', 'false')
  formData.append('OCREngine', '2')

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  })

  if (!res.ok) {
    throw new Error(`OCR API error: ${res.status}`)
  }

  const data = await res.json()

  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage || 'OCR processing failed')
  }

  const text = data.ParsedResults?.[0]?.ParsedText || ''
  if (!text.trim()) {
    throw new Error('Tidak bisa membaca teks dari gambar.')
  }

  return text
}

export async function POST(req: Request) {
  try {
    // Auth check — require authenticated session
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Plan check — Premium only for scan-receipt.
    // Primary source: server settings. Fallback: client plan header for legacy/localStorage premium users
    // whose plan was activated before server-side settings sync existed.
    const serverPlan = await getUserPlan(emailToUserId(session.user.email))
    const clientPlan = req.headers.get('x-finwise-plan')
    const plan = serverPlan === 'premium' || clientPlan === 'premium' ? 'premium' : serverPlan
    if (plan !== 'premium') {
      return Response.json(
        { error: 'Fitur Scan Struk AI hanya tersedia di paket Premium.' },
        { status: 403 }
      )
    }

    // Rate limit: 10 scans per minute per IP
    const ip = getClientIp(req)
    const rl = checkRateLimit(`scan:${ip}`, { windowMs: 60_000, max: 10 })
    if (!rl.allowed) {
      return Response.json(
        { error: 'Terlalu banyak scan. Tunggu sebentar.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    const body = await req.json()

    // Validate input
    const parsed = scanReceiptSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Gambar tidak valid.' }, { status: 400 })
    }

    const { image } = parsed.data

    // Step 1: OCR the image
    let ocrText: string
    try {
      ocrText = await ocrSpace(image)
    } catch (ocrErr) {
      console.error('[scan-receipt] OCR error:', ocrErr instanceof Error ? ocrErr.message : ocrErr)
      return Response.json({ error: 'Gagal membaca struk. Pastikan gambar jelas dan ada teks.' }, { status: 422 })
    }



    // Step 2: Parse the OCR text
    const items = extractItems(ocrText)
    const result: Record<string, unknown> = {
      store: extractStore(ocrText),
      amount: extractAmount(ocrText),
      category: detectCategory(ocrText),
      date: extractDate(ocrText),
      items,
    }

    if (process.env.NODE_ENV !== 'production') {
      result.ocrText = ocrText
    }

    return Response.json(result)
  } catch (err) {

    return Response.json({ error: 'Gagal membaca struk. Coba lagi.' }, { status: 500 })
  }
}

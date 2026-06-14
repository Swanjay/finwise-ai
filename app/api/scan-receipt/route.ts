import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { scanReceiptSchema } from '@/lib/validate'

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

// Extract amount from OCR text
function extractAmount(text: string): number {
  // Look for "TOTAL" or "Grand Total" or "Bayar" followed by amount
  const totalPatterns = [
    /(?:grand\s*total|total\s*belanja|total\s*pembayaran|total|bayar|payment|amount|subtotal)[:\s]*rp\.?\s*([\d.,]+)/gi,
    /(?:Rp|IDR)\s*([\d.,]+)/gi,
  ]

  let amounts: number[] = []
  for (const pattern of totalPatterns) {
    const matches = [...text.matchAll(pattern)]
    for (const m of matches) {
      const num = parseInt(m[1].replace(/[.,]/g, ''))
      if (num > 0 && num < 100_000_000) amounts.push(num) // Reasonable range
    }
  }

  // Return the largest amount (usually the total)
  if (amounts.length > 0) {
    return Math.max(...amounts)
  }

  // Fallback: find any number that looks like Rupiah
  const fallback = text.match(/(\d{1,3}(?:\.\d{3})+|\d{4,})/g)
  if (fallback) {
    const nums = fallback.map(f => parseInt(f.replace(/[.,]/g, ''))).filter(n => n > 1000 && n < 100_000_000)
    if (nums.length > 0) return Math.max(...nums)
  }

  return 0
}

// Detect store name from OCR text
function extractStore(text: string): string {
  // Look for common store name patterns
  const storePatterns = [
    /(?:tok|store|merchant|outlet|branch)[:\s]+([A-Z][\w\s]+?)(?:\n|$)/i,
    /^(?:PT|CV|TB|UD|Toko|Rumah Makan|Restoran|Cafe)\s+([\w\s]+?)(?:\n|$)/im,
    /^([A-Z][\w\s]*(?:Mart|Mart|Store|Shop|Mall|Plaza))/im,
    /^([\w\s]*(?:Indomaret|Alfamart|Alfamidi|Circle K|Lawson|Hypermart|Carrefour|Transmart))/im,
  ]

  for (const pattern of storePatterns) {
    const match = text.match(pattern)
    if (match) {
      const name = (match[1] || match[0]).trim()
      if (name.length > 2 && name.length < 50) return name
    }
  }

  // Use first non-empty line as store name
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

  // Various Indonesian date formats
  const datePatterns = [
    /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/, // DD-MM-YYYY
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
          // YYYY-MM-DD
          const [, y, m, d] = match
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        } else if (pattern === datePatterns[1]) {
          // DD-MM-YYYY
          const [, d, m, y] = match
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        } else {
          // DD Mon YYYY
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
async function ocrSpace(imageBase64: string): Promise<string> {
  const apiKey = 'K85586484388957' // Free OCR.space API key

  // Build multipart form data
  const formData = new FormData()

  // Convert data URL to blob
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'image/jpeg' })

  formData.append('file', blob, 'receipt.jpg')
  formData.append('apikey', apiKey)
  formData.append('language', 'ind') // Indonesian
  formData.append('isOverlayRequired', 'false')
  formData.append('OCREngine', '2') // Engine 2 is better for receipts

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
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
    // Auth check — allow guest or authenticated
    const guestCookie = req.headers.get('cookie')?.includes('fw-guest=true')
    const session = await getServerSession(authOptions)
    if (!session && !guestCookie) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
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

    console.log('[scan-receipt] OCR text:', ocrText.slice(0, 200))

    // Step 2: Parse the OCR text
    const today = new Date().toISOString().slice(0, 10)
    const result = {
      store: extractStore(ocrText),
      amount: extractAmount(ocrText),
      category: detectCategory(ocrText),
      date: extractDate(ocrText),
    }

    return Response.json(result)
  } catch (err) {
    console.log('[scan-receipt] error:', err instanceof Error ? err.message : err)
    return Response.json({ error: 'Gagal membaca struk. Coba lagi.' }, { status: 500 })
  }
}

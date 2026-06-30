import { NextResponse } from "next/server"

// POST /api/ai/voice-parse — Parse voice input to transaction
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text } = body

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text tidak boleh kosong" }, { status: 400 })
    }

    // Parse Indonesian natural language to transaction
    const parsed = parseIndonesianTransaction(text)

    return NextResponse.json({
      ok: true,
      parsed,
      original: text,
    })
  } catch (err) {
    console.error("[voice-parse] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

interface ParsedTransaction {
  type: "income" | "expense"
  amount: number
  category: string
  note: string
  confidence: number
}

function parseIndonesianTransaction(text: string): ParsedTransaction {
  const lower = text.toLowerCase().trim()
  
  // Detect type
  const incomeKeywords = ["gaji", "salary", "terima", "dapat", "masuk", "transfer masuk", "bonus", "THR", "pendapatan"]
  const isIncome = incomeKeywords.some(kw => lower.includes(kw.toLowerCase()))
  const type = isIncome ? "income" : "expense"

  // Extract amount
  let amount = 0
  // First try patterns with suffix (rb/ribu/jt/juta/k)
  const suffixPatterns = [
    /(\d+[.,]?\d*)\s*(?:rb|ribu)\b/i,        // 25rb, 25 ribu
    /rp\.?\s*(\d+[.,]?\d*)/i,                // Rp 25000, Rp. 25.000
    /(\d+[.,]?\d*)\s*(?:jt|juta)\b/i,        // 1jt, 1 juta, 2jt
    /(\d+[.,]?\d*)(?:jt|juta)\b/i,           // 2jt (no space)
    /(\d+[.,]?\d*)\s*k\b/i,                  // 25k
    /(\d+[.,]?\d*)k\b/i,                     // 25k (no space)
  ]
  const plainNumberPattern = /(\d+[.,]?\d*)/i

  for (const pattern of suffixPatterns) {
    const match = lower.match(pattern)
    if (match) {
      let raw = match[1].replace(/[.,]/g, "")
      amount = parseInt(raw, 10)
      
      // Apply multipliers based on what matched
      const fullMatch = match[0].toLowerCase()
      if (/rb|ribu/.test(fullMatch)) amount *= 1000
      else if (/jt|juta/.test(fullMatch)) amount *= 1000000
      else if (/k\b/.test(fullMatch) && amount < 1000) amount *= 1000
      
      break
    }
  }
  // Fallback: plain number (e.g. "beli kopi 15000")
  if (amount === 0) {
    const match = lower.match(plainNumberPattern)
    if (match) amount = parseInt(match[1].replace(/[.,]/g, ""), 10) || 0
  }

  // Detect category
  const categoryMap: Record<string, string[]> = {
    "Makanan": ["makan", "makanan", "food", "nasi", "ayam", "ikan", "sayur", "buah", "snack", "cemilan", "batagor", "bakso", "sate", "mie", "kopi", "teh", "jus", "minum", "minuman", "sarapan", "makan siang", "makan malam"],
    "Transportasi": ["transport", "transportasi", "bensin", "bbm", "ojek", "ojol", "grab", "gojek", "taxi", "bus", "kereta", "mrt", "transjakarta", "parkir", "tol"],
    "Belanja": ["belanja", "shopping", "beli", "belanja", "supermarket", "minimarket", "indomaret", "alfamart", "mall"],
    "Tagihan": ["tagihan", "listrik", "air", "pdam", "internet", "wifi", "pulsa", "token", "pln"],
    "Hiburan": ["hiburan", "entertainment", "nonton", "bioskop", "film", "game", "spotify", "netflix", "youtube"],
    "Kesehatan": ["kesehatan", "health", "obat", "dokter", "rumah sakit", "apotek", "vitamin"],
    "Pendidikan": ["pendidikan", "sekolah", "kuliah", "buku", "kursus", "les", "seminar"],
    "Transfer": ["transfer", "kirim", "pindah"],
    "Gaji": ["gaji", "salary", "gajian"],
    "Pendapatan": ["pendapatan", "bonus", "thr", "terima", "dapat", "masuk"],
  }

  let category = "Lainnya"
  let maxMatch = 0

  for (const [cat, keywords] of Object.entries(categoryMap)) {
    const matchCount = keywords.filter(kw => lower.includes(kw)).length
    if (matchCount > maxMatch) {
      maxMatch = matchCount
      category = cat
    }
  }

  // Extract note (everything that's not amount or category keywords)
  let note = text.replace(/rp\.?\s*\d+[\.,]?\d*/gi, "").replace(/\d+[\.,]?\d*\s*(?:rb|ribu|k|jt|juta)/gi, "").trim()
  if (note.length > 100) note = note.substring(0, 100)

  // Calculate confidence
  let confidence = 0.5
  if (amount > 0) confidence += 0.3
  if (maxMatch > 0) confidence += 0.2

  return {
    type,
    amount,
    category,
    note: note || text.substring(0, 50),
    confidence: Math.min(1, confidence),
  }
}

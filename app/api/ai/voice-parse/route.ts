import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { traceAI } from "@/lib/langfuse"
import { getUserPlan } from "@/lib/plans-server"
import { createHash } from "crypto"

function emailToUserId(email: string): string {
  const hash = createHash('md5').update(email.toLowerCase().trim()).digest('hex')
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`
}

// POST /api/ai/voice-parse — Parse voice input to transaction
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Plan check — Premium only for voice features
  const userPlan = await getUserPlan(emailToUserId(session.user.email))
  if (userPlan !== 'premium') {
    return NextResponse.json({ error: "Voice input hanya tersedia di paket Premium." }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { text } = body

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text tidak boleh kosong" }, { status: 400 })
    }

    // Parse Indonesian natural language to transaction (with Langfuse tracing)
    const parsed = await traceAI(
      "voice-parse",
      {
        userId: session?.user?.email || "anonymous",
        inputText: text,
      },
      async (span) => {
        const result = parseIndonesianTransaction(text)
        span.update({
          output: result,
          metadata: {
            category: result.category,
            amount: result.amount,
            confidence: result.confidence,
            type: result.type,
          },
        })
        return result
      },
      session?.user?.email || undefined
    )

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
  const suffixPatterns = [
    /(\d+[.,]?\d*)\s*(?:rb|ribu)\b/i,
    /rp\.?\s*(\d+[.,]?\d*)/i,
    /(\d+[.,]?\d*)\s*(?:jt|juta)\b/i,
    /(\d+[.,]?\d*)(?:jt|juta)\b/i,
    /(\d+[.,]?\d*)\s*k\b/i,
    /(\d+[.,]?\d*)k\b/i,
  ]
  const plainNumberPattern = /(\d+[.,]?\d*)/i

  for (const pattern of suffixPatterns) {
    const match = lower.match(pattern)
    if (match) {
      let raw = match[1].replace(/[.,]/g, "")
      amount = parseInt(raw, 10)
      
      const fullMatch = match[0].toLowerCase()
      if (/rb|ribu/.test(fullMatch)) amount *= 1000
      else if (/jt|juta/.test(fullMatch)) amount *= 1000000
      else if (/k\b/.test(fullMatch) && amount < 1000) amount *= 1000
      
      break
    }
  }
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

  let note = text.replace(/rp\.?\s*\d+[\.,]?\d*/gi, "").replace(/\d+[.,]?\d*\s*(?:rb|ribu|k|jt|juta)/gi, "").trim()
  if (note.length > 100) note = note.substring(0, 100)

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

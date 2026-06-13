import { streamText, convertToModelMessages, type UIMessage } from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, finance }: { messages: UIMessage[]; finance?: string } =
    await req.json()

  const system = `Kamu adalah "FinWise AI Advisor", penasihat keuangan pribadi yang ramah, hangat, dan membumi. Selalu menjawab dalam Bahasa Indonesia yang santai tapi tetap profesional.

Tugasmu: bantu pengguna mengelola keuangan pribadi — analisis pengeluaran, tips hemat, dan rencana tabungan.

Pedoman menjawab:
- Gunakan data keuangan pengguna di bawah ini sebagai dasar setiap jawaban. Sebut angka konkret (dalam Rupiah) bila relevan.
- Beri saran yang spesifik, actionable, dan realistis untuk konteks Indonesia.
- Jawaban ringkas dan rapi. Gunakan poin-poin (bullet) bila perlu, hindari paragraf bertele-tele.
- Bila ditanya hal di luar keuangan, arahkan kembali dengan sopan ke topik keuangan.
- Acuan sehat: aturan 50/30/20 (kebutuhan/keinginan/tabungan).

=== DATA KEUANGAN PENGGUNA (bulan berjalan) ===
${finance ?? 'Data tidak tersedia.'}`

  const result = streamText({
    model: 'google/gemini-3-flash',
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}

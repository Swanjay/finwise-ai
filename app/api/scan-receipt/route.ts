import { generateText, Output } from 'ai'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { scanReceiptSchema } from '@/lib/validate'

export const maxDuration = 30

const CATEGORY_IDS = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'bills',
  'health',
  'education',
  'internet',
] as const

const ReceiptSchema = z.object({
  store: z.string().describe('Nama toko/merchant pada struk. Jika tidak terbaca, gunakan "Struk Belanja".'),
  amount: z.number().describe('Total akhir yang dibayar dalam Rupiah, sebagai angka tanpa titik/koma.'),
  category: z
    .enum(CATEGORY_IDS)
    .describe(
      'Kategori pengeluaran paling sesuai: food (makan/minum), transport, shopping (belanja/retail), entertainment (hiburan), bills (tagihan), health (kesehatan/apotek), education (pendidikan), internet (pulsa/paket data).',
    ),
  date: z.string().describe('Tanggal transaksi format YYYY-MM-DD. Jika tidak terbaca, gunakan tanggal hari ini.'),
})

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
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

    const today = new Date().toISOString().slice(0, 10)

    const { experimental_output } = await generateText({
      model: 'google/gemini-3-flash',
      experimental_output: Output.object({ schema: ReceiptSchema }),
      system:
        'Kamu adalah asisten yang membaca struk belanja Indonesia. Ekstrak nama toko, total akhir yang dibayar (bukan subtotal), kategori pengeluaran, dan tanggal. Selalu kembalikan angka total dalam Rupiah tanpa pemisah ribuan.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Baca struk ini dan ekstrak datanya. Jika tanggal tidak terbaca, gunakan ${today}.`,
            },
            { type: 'image', image },
          ],
        },
      ],
    })

    return Response.json(experimental_output)
  } catch (err) {
    console.log('[v0] scan-receipt error:', err instanceof Error ? err.message : err)
    return Response.json({ error: 'Gagal membaca struk. Coba lagi.' }, { status: 500 })
  }
}

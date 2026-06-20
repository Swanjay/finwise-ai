// app/api/invite-codes/validate/route.ts
// POST: Validate invite code — user submits code, we validate + mark as used

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { validateInviteCode } from '@/lib/invite-codes'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const code = body?.code
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Kode tidak boleh kosong' }, { status: 400 })
  }

  // Dapatkan user ID dari session
  const userId = (session.user as Record<string, unknown>).id as string
  const email = session.user.email || undefined

  // Dapatkan IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') || 'unknown'

  const result = await validateInviteCode(code, userId, email, undefined, ip)

  if (result.valid) {
    // Set activation cookie (7 hari)
    const response = NextResponse.json({ ok: true })
    response.cookies.set('finwise-activated', 'true', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 hari
    })
    return response
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
}

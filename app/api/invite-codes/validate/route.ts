// app/api/invite-codes/validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { validateInviteCode, isUserActivated } from '@/lib/invite-codes'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as Record<string, unknown>).id as string
  const email = session.user.email || undefined

  // CHECK: user sudah pernah aktivasi? Auto-set cookie + redirect
  const alreadyActive = await isUserActivated(userId)
  if (alreadyActive) {
    const response = NextResponse.json({ ok: true, alreadyActivated: true })
    response.cookies.set('finwise-activated', 'true', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60, // 1 tahun
    })
    return response
  }

  const body = await req.json().catch(() => null)
  const code = body?.code
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Kode tidak boleh kosong' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') || 'unknown'

  const result = await validateInviteCode(code, userId, email, undefined, ip)

  if (result.valid) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('finwise-activated', 'true', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60,
    })
    return response
  } else {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
}

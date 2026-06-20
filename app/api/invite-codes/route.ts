// app/api/invite-codes/route.ts
// Admin-only: manage invite codes

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { createInviteCode, listInviteCodes, deleteInviteCode, getInviteUsageStats } from '@/lib/invite-codes'

// Helper: check admin
async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  // For now, admin = the first user or owner email from env
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && session.user.email === adminEmail) return session
  // If no ADMIN_EMAIL configured, allow all authenticated users (development)
  if (!adminEmail) return session
  return null
}

// GET: List all invite codes + usage stats
export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const [codes, usage] = await Promise.all([
    listInviteCodes(),
    getInviteUsageStats(),
  ])

  return NextResponse.json({ codes, usage })
}

// POST: Create new invite code
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const userId = (session.user as Record<string, unknown>).id as string

  const result = await createInviteCode({
    code: body.code,
    maxUses: body.maxUses || 1,
    createdBy: userId,
    description: body.description,
    expiresInDays: body.expiresInDays,
  })

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, code: result.code })
}

// DELETE: Delete invite code
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const code = body?.code
  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 })
  }

  const success = await deleteInviteCode(code)
  return NextResponse.json({ ok: success })
}

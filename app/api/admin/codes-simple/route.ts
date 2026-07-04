import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ── Admin credentials from env vars (REQUIRED) ──
const ADMIN_USER = process.env.ADMIN_USER
const ADMIN_PASS = process.env.ADMIN_PASS

if (!ADMIN_USER || !ADMIN_PASS) {
  console.warn('[admin] ADMIN_USER and ADMIN_PASS env vars are required')
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// HMAC-based admin auth (constant-time, no plaintext in cookie)
function createAdminToken(password: string): string {
  return crypto.createHmac('sha256', password).update('finwise-admin').digest('hex')
}

function verifyAdminCookie(req: Request): boolean {
  if (!ADMIN_PASS) return false
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/fw-admin=([^;]+)/)
  if (!match) return false
  const expected = createAdminToken(ADMIN_PASS)
  try {
    return crypto.timingSafeEqual(Buffer.from(decodeURIComponent(match[1])), Buffer.from(expected))
  } catch {
    return false
  }
}

import { rateLimitMiddleware } from "@/lib/rate-limit-kv"

// ── POST /api/admin/codes-simple → login ──
export async function POST(req: Request) {
  // Rate limit: 5 requests per minute per IP for admin routes
  const rateLimitResponse = await rateLimitMiddleware(req, { windowMs: 60_000, max: 5 })
  if (rateLimitResponse) return rateLimitResponse

  const body = await req.json().catch(() => ({}))

  // Login action
  if (body.action === 'login') {
    const adminUser = ADMIN_USER
    const adminPass = ADMIN_PASS
    if (!adminUser || !adminPass) {
      return NextResponse.json({ ok: false, error: 'Admin not configured' }, { status: 500 })
    }
    if (!body.user || !body.pass) {
      return NextResponse.json({ ok: false, error: 'Username atau password salah' }, { status: 401 })
    }
    // Constant-time HMAC comparison to prevent timing attack
    const expected = createAdminToken(adminPass)
    const actual = createAdminToken(String(body.pass))
    // Timing-safe comparison for username to prevent timing attacks
    let userMatch = false
    try {
      userMatch = crypto.timingSafeEqual(
        Buffer.from(body.user.padEnd(128)),
        Buffer.from(adminUser.padEnd(128))
      )
    } catch { userMatch = false }
    const passMatch = userMatch && expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    if (userMatch && passMatch) {
      const token = createAdminToken(adminPass)
      const res = NextResponse.json({ ok: true })
      res.cookies.set('fw-admin', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      return res
    }
    return NextResponse.json({ ok: false, error: 'Username atau password salah' }, { status: 401 })
  }

  // Check auth cookie for other actions
  if (!verifyAdminCookie(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Create code
  if (body.action === 'create') {
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 })

    const code = body.code || generateCode()
    const expiresAt = body.expiresAt || null
    const planTier = body.planTier || 'pro'
    const { error } = await supabase.from('invite_codes').insert({
      code,
      max_uses: body.max_uses || 1,
      description: body.description || null,
      plan_tier: planTier,
      expires_at: expiresAt,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'Kode sudah ada' }, { status: 409 })
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, code })
  }

  // Delete code
  if (body.action === 'delete') {
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 })

    const { error } = await supabase
      .from('invite_codes')
      .delete()
      .eq('code', body.code)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Edit code (update expiry/description/maxUses/plan_tier)
  if (body.action === 'update') {
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 })

    const updates: Record<string, unknown> = {}
    if (body.expiresAt !== undefined) updates.expires_at = body.expiresAt || null
    if (body.description !== undefined) updates.description = body.description || null
    if (body.max_uses !== undefined) updates.max_uses = body.max_uses
    if (body.planTier && ['basic', 'pro', 'premium'].includes(body.planTier)) updates.plan_tier = body.planTier

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: 'Tidak ada perubahan' }, { status: 400 })
    }

    const { error } = await supabase
      .from('invite_codes')
      .update(updates)
      .eq('code', body.code)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}

// ── GET /api/admin/codes-simple → list all codes ──
export async function GET(req: Request) {
  if (!verifyAdminCookie(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 })

  const { data, error } = await supabase
    .from('invite_codes')
    .select('code, max_uses, used_count, description, created_at, expires_at, plan_tier')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // Also get usage details
  const { data: usage } = await supabase
    .from('invite_usage')
    .select('code, user_id, email, used_at')
    .order('used_at', { ascending: false })

  return NextResponse.json({ ok: true, codes: data || [], usage: usage || [] })
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'FW-'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(crypto.randomInt(chars.length))
  }
  return result
}

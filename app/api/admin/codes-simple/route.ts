import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ── Hardcoded admin credentials ──
const ADMIN_USER = process.env.ADMIN_USER || 'fure'
const ADMIN_PASS = process.env.ADMIN_PASS || '123'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ── POST /api/admin/codes-simple → login ──
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  // Login action
  if (body.action === 'login') {
    if (body.user === ADMIN_USER && body.pass === ADMIN_PASS) {
      const res = NextResponse.json({ ok: true })
      res.cookies.set('fw-admin', ADMIN_PASS, {
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
  const cookie = req.headers.get('cookie') || ''
  if (!cookie.includes(`fw-admin=${ADMIN_PASS}`)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Create code
  if (body.action === 'create') {
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 })

    const code = body.code || generateCode()
    const expiresAt = body.expiresAt || null
    const { error } = await supabase.from('invite_codes').insert({
      code,
      max_uses: body.maxUses || 1,
      description: body.description || null,
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

  // Edit code (update expiry/description/maxUses)
  if (body.action === 'update') {
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 })

    const updates: Record<string, unknown> = {}
    if (body.expiresAt !== undefined) updates.expires_at = body.expiresAt || null
    if (body.description !== undefined) updates.description = body.description || null
    if (body.maxUses !== undefined) updates.max_uses = body.maxUses

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
  const cookie = req.headers.get('cookie') || ''
  if (!cookie.includes(`fw-admin=${ADMIN_PASS}`)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 })

  const { data, error } = await supabase
    .from('invite_codes')
    .select('code, max_uses, used_count, description, created_at, expires_at')
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
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

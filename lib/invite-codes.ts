// lib/invite-codes.ts — Invite code CRUD (server-side, uses service role key)
import crypto from 'crypto'

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseServiceKey)
}

// ===== VALIDATE CODE =====
export async function validateInviteCode(
  code: string,
  userId: string,
  email?: string,
  telegramId?: string,
  ip?: string
): Promise<{ valid: boolean; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) {
    // Supabase MUST be configured — never bypass validation
    console.error('[invite-codes] Supabase not configured, rejecting validation')
    return { valid: false, error: 'Server tidak terkonfigurasi. Hubungi admin.' }
  }

  // Normalize code
  const normalizedCode = code.trim().toUpperCase()

  // 1. Cek kode ada
  const { data: invite, error: fetchError } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', normalizedCode)
    .single()

  if (fetchError || !invite) {
    return { valid: false, error: 'Kode tidak ditemukan' }
  }

  // 2. Cek expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { valid: false, error: 'Kode sudah expired' }
  }

  // 3. Cek quota
  if (invite.used_count >= invite.max_uses) {
    return { valid: false, error: 'Kode sudah habis digunakan' }
  }

  // 4. Cek user belum pernah pake kode apapun (1 user = 1 kode)
  const { data: existingUsage } = await supabase
    .from('invite_usage')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (existingUsage && existingUsage.length > 0) {
    return { valid: false, error: 'Kamu sudah menggunakan kode invitasi sebelumnya' }
  }

  // 5. Increment used_count
  const { error: updateError } = await supabase
    .from('invite_codes')
    .update({ used_count: invite.used_count + 1 })
    .eq('code', normalizedCode)

  if (updateError) {
    console.error('[invite-codes] Failed to update count:', updateError)
    return { valid: false, error: 'Gagal memproses kode' }
  }

  // 6. Record usage
  const { error: insertError } = await supabase
    .from('invite_usage')
    .insert({
      code: normalizedCode,
      user_id: userId,
      email: email || null,
      telegram_id: telegramId || null,
      ip: ip || null,
    })

  if (insertError) {
    console.error('[invite-codes] Failed to record usage:', insertError)
    // Non-fatal: code already used, just log
  }

  return { valid: true }
}

// ===== CHECK IF USER ALREADY ACTIVATED =====
export async function isUserActivated(userId: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) {
    // Supabase MUST be configured — can't verify activation without it
    console.error('[invite-codes] Supabase not configured for isUserActivated')
    return false
  }

  const { data } = await supabase
    .from('invite_usage')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  return (data && data.length > 0) || false
}

// ===== ADMIN: CREATE CODE =====
export async function createInviteCode(options: {
  code?: string         // custom code, atau auto-generate
  maxUses?: number      // default 1
  createdBy?: string    // admin user ID
  description?: string
  expiresInDays?: number // 0 = tidak expire
}): Promise<{ code: string; error?: string }> {
  const supabase = getSupabase()
  if (!supabase) return { code: '', error: 'Supabase not configured' }

  // Generate code jika tidak diberikan
  const code = options.code?.trim().toUpperCase() || generateCode()

  // Hitung expiry
  let expiresAt: string | null = null
  if (options.expiresInDays && options.expiresInDays > 0) {
    const d = new Date()
    d.setDate(d.getDate() + options.expiresInDays)
    expiresAt = d.toISOString()
  }

  const { error } = await supabase
    .from('invite_codes')
    .insert({
      code,
      max_uses: options.maxUses || 1,
      used_count: 0,
      created_by: options.createdBy || 'admin',
      description: options.description || null,
      expires_at: expiresAt,
    })

  if (error) {
    if (error.code === '23505') {
      return { code, error: 'Kode sudah ada' }
    }
    return { code, error: error.message }
  }

  return { code }
}

// ===== ADMIN: LIST ALL CODES =====
export async function listInviteCodes(): Promise<Array<{
  code: string
  maxUses: number
  usedCount: number
  createdBy: string | null
  description: string | null
  expiresAt: string | null
  createdAt: string
}>> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((r: Record<string, unknown>) => ({
    code: r.code as string,
    maxUses: r.max_uses as number,
    usedCount: r.used_count as number,
    createdBy: r.created_by as string | null,
    description: r.description as string | null,
    expiresAt: r.expires_at as string | null,
    createdAt: r.created_at as string,
  }))
}

// ===== ADMIN: DELETE CODE =====
export async function deleteInviteCode(code: string): Promise<boolean> {
  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase
    .from('invite_codes')
    .delete()
    .eq('code', code.toUpperCase())

  return !error
}

// ===== ADMIN: GET USAGE STATS =====
export async function getInviteUsageStats(): Promise<Array<{
  code: string
  userId: string
  email: string | null
  telegramId: string | null
  ip: string | null
  usedAt: string
}>> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('invite_usage')
    .select('*')
    .order('used_at', { ascending: false })

  if (error || !data) return []

  return data.map((r: Record<string, unknown>) => ({
    code: r.code as string,
    userId: r.user_id as string,
    email: r.email as string | null,
    telegramId: r.telegram_id as string | null,
    ip: r.ip as string | null,
    usedAt: r.used_at as string,
  }))
}

// ===== UTILITY: Generate random code =====
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 confusion
  const bytes = crypto.randomBytes(6)
  let result = 'FW-'
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

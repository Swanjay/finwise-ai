-- ============================================
-- INVITE CODES TABLE — Run di Supabase SQL Editor
-- ============================================

-- 1. Tabel invite codes
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  max_uses INT DEFAULT 1,
  used_count INT DEFAULT 0,
  created_by TEXT,              -- user ID yang bikin kode (admin)
  expires_at TIMESTAMPTZ,       -- NULL = tidak expire
  description TEXT,             -- label: "Buat Dika", "Undangan keluarga"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tracking siapa pake kode apa
CREATE TABLE IF NOT EXISTS invite_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL REFERENCES invite_codes(code) ON DELETE CASCADE,
  user_id TEXT NOT NULL,        -- Supabase auth user ID
  email TEXT,                   -- email user (opsional, buat audit)
  telegram_id TEXT,             -- Telegram ID kalo login via TG
  ip TEXT,                      -- IP saat registrasi
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_usage_user_id ON invite_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_usage_code ON invite_usage(code);

-- 4. RLS policies (admin-only management, public validation)
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_usage ENABLE ROW LEVEL SECURITY;

-- Admin bisa manage semua kode (gunakan service role key di API)
CREATE POLICY "Admin can manage invite codes" ON invite_codes
  FOR ALL USING (true);

-- Admin bisa lihat semua usage
CREATE POLICY "Admin can view invite usage" ON invite_usage
  FOR ALL USING (true);

-- 5. Insert contoh kode (ganti dengan kode kamu)
INSERT INTO invite_codes (code, max_uses, created_by, description)
VALUES
  ('FIN-WISE-23A9', 1, 'admin', 'Kode untuk Sofyan'),
  ('FIN-FAMILY-7K', 5, 'admin', 'Undangan keluarga')
ON CONFLICT (code) DO NOTHING;

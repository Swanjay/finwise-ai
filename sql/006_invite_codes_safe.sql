-- ============================================
-- FinWise Invite Codes Migration — Safe Version
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if invite_codes exists, add missing columns if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'invite_codes') THEN
    CREATE TABLE invite_codes (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      plan_tier TEXT NOT NULL CHECK (plan_tier IN ('pro', 'premium')),
      is_active BOOLEAN DEFAULT true,
      max_uses INTEGER DEFAULT NULL,
      uses INTEGER DEFAULT 0,
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP DEFAULT NULL,
      notes TEXT DEFAULT ''
    );
  ELSE
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invite_codes' AND column_name = 'plan_tier') THEN
      ALTER TABLE invite_codes ADD COLUMN plan_tier TEXT NOT NULL DEFAULT 'pro';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invite_codes' AND column_name = 'is_active') THEN
      ALTER TABLE invite_codes ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invite_codes' AND column_name = 'max_uses') THEN
      ALTER TABLE invite_codes ADD COLUMN max_uses INTEGER DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invite_codes' AND column_name = 'uses') THEN
      ALTER TABLE invite_codes ADD COLUMN uses INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invite_codes' AND column_name = 'notes') THEN
      ALTER TABLE invite_codes ADD COLUMN notes TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'invite_codes' AND column_name = 'expires_at') THEN
      ALTER TABLE invite_codes ADD COLUMN expires_at TIMESTAMP DEFAULT NULL;
    END IF;
    -- Set plan_tier to 'pro' for existing rows if still null
    UPDATE invite_codes SET plan_tier = 'pro' WHERE plan_tier IS NULL;
  END IF;
END$$;

-- 2. Check if users_plan exists, add missing columns if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'users_plan') THEN
    CREATE TABLE users_plan (
      user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
      plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'pro', 'premium')),
      source_code TEXT REFERENCES invite_codes(code),
      assigned_at TIMESTAMP DEFAULT NOW()
    );
  ELSE
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users_plan' AND column_name = 'plan_tier') THEN
      ALTER TABLE users_plan ADD COLUMN plan_tier TEXT NOT NULL DEFAULT 'basic';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users_plan' AND column_name = 'source_code') THEN
      ALTER TABLE users_plan ADD COLUMN source_code TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users_plan' AND column_name = 'assigned_at') THEN
      ALTER TABLE users_plan ADD COLUMN assigned_at TIMESTAMP DEFAULT NOW();
    END IF;
    -- Set plan_tier to 'basic' for existing rows if still null
    UPDATE users_plan SET plan_tier = 'basic' WHERE plan_tier IS NULL;
  END IF;
END$$;

-- 3. Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_plan ON invite_codes(plan_tier);
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);

CREATE INDEX IF NOT EXISTS idx_users_plan_user_id ON users_plan(user_id);
CREATE INDEX IF NOT EXISTS idx_users_plan_plan ON users_plan(plan_tier);

-- 4. Enable RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_plan ENABLE ROW LEVEL SECURITY;

-- 5. Insert default 'basic' plan for all existing users
INSERT INTO users_plan (user_id, plan_tier)
SELECT id, 'basic' FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM users_plan WHERE user_id = auth.users.id);

-- Done!
SELECT '✅ Migration completed' AS message;
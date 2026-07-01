-- ============================================
-- FinWise Invite Codes Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'pro', 'premium')),
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT NULL,  -- null = unlimited
  uses INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  notes TEXT DEFAULT ''
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_plan ON invite_codes(plan_tier);
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);

-- Enable RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all codes" ON invite_codes
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM auth.users WHERE email ilike '%finny.biz.id'
    )
  );

CREATE POLICY "Admins can insert codes" ON invite_codes
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM auth.users WHERE email ilike '%finny.biz.id'
    )
  );

CREATE POLICY "Admins can update codes" ON invite_codes
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM auth.users WHERE email ilike '%finny.biz.id'
    )
  );

CREATE POLICY "Admins can delete codes" ON invite_codes
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM auth.users WHERE email ilike '%finny.biz.id'
    )
  );

-- users_plan table: track user's plan (override from code)
CREATE TABLE IF NOT EXISTS users_plan (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'pro', 'premium')),
  source_code TEXT REFERENCES invite_codes(code) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_plan_user_id ON users_plan(user_id);
CREATE INDEX IF NOT EXISTS idx_users_plan_plan ON users_plan(plan_tier);

-- Enable RLS
ALTER TABLE users_plan ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own plan" ON users_plan
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all plans" ON users_plan
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM auth.users WHERE email ilike '%finny.biz.id'
    )
  );

CREATE POLICY "Admins can manage plans" ON users_plan
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM auth.users WHERE email ilike '%finny.biz.id'
    )
  );
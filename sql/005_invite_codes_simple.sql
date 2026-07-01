-- ============================================
-- FinWise Invite Codes Migration — Minimal Version
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. invite_codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('pro', 'premium')),
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT NULL,  -- null = unlimited
  uses INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  notes TEXT DEFAULT ''
);

-- 2. users_plan table
CREATE TABLE IF NOT EXISTS users_plan (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'pro', 'premium')),
  source_code TEXT REFERENCES invite_codes(code),
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_plan ENABLE ROW LEVEL SECURITY;
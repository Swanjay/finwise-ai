-- Migration: Add users table for NextAuth + fix RLS for service-role access
-- Run this in Supabase SQL Editor AFTER the original schema

-- 1. Users table for NextAuth (email-based, no Supabase Auth dependency)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Disable RLS on all tables (we use service-role key from server, not Supabase Auth)
-- Service-role bypasses RLS anyway, but let's be explicit
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 3. Categories table (for custom categories)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📌',
  type TEXT DEFAULT 'expense',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update foreign keys to reference users table instead of auth.users
-- (Only run if tables were created with auth.users FK)
-- Skip if already pointing to users table

-- 5. Add indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

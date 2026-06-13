-- FinWise Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(15,2) NOT NULL,
  category TEXT NOT NULL,
  note TEXT DEFAULT '',
  date TEXT NOT NULL,
  wallet TEXT DEFAULT 'cash',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  limit_amount NUMERIC(15,2) NOT NULL,
  color TEXT DEFAULT '#a78bfa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target NUMERIC(15,2) NOT NULL,
  saved NUMERIC(15,2) DEFAULT 0,
  color TEXT DEFAULT '#a78bfa',
  emoji TEXT DEFAULT '🎯',
  deadline TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance NUMERIC(15,2) DEFAULT 0,
  color TEXT DEFAULT '#00ff9d',
  icon TEXT DEFAULT '💵',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring items table
CREATE TABLE IF NOT EXISTS recurring (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(15,2) NOT NULL,
  category TEXT NOT NULL,
  note TEXT DEFAULT '',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  wallet TEXT DEFAULT 'cash',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table (for monthly income, etc.)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON recurring(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id_key ON settings(user_id, key);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Budgets
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Goals
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

-- Wallets
CREATE POLICY "Users can view own wallets" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets" ON wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets" ON wallets
  FOR DELETE USING (auth.uid() = user_id);

-- Recurring
CREATE POLICY "Users can view own recurring" ON recurring
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring" ON recurring
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring" ON recurring
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring" ON recurring
  FOR DELETE USING (auth.uid() = user_id);

-- Settings
CREATE POLICY "Users can view own settings" ON settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON settings
  FOR DELETE USING (auth.uid() = user_id);

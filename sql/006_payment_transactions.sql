-- ============================================
-- FinWise Payment Transactions Migration
-- Run this in Supabase SQL Editor after invite_codes migration
-- ============================================

-- 3. payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'pro', 'premium')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'expired')),
  payment_method TEXT,
  transaction_ref TEXT, -- Gateway's transaction ID
  gateway_response JSONB, -- Raw response from payment gateway
  source_code TEXT REFERENCES invite_codes(code), -- If payment was initiated from invite
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_email ON payment_transactions(email);

-- RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_transactions_updated_at 
    BEFORE UPDATE ON payment_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Policies
-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own transactions
CREATE POLICY "Users can create own transactions" ON payment_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can see all transactions (emails ending with @finny.biz.id)
CREATE POLICY "Admin can view all transactions" ON payment_transactions
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email LIKE '%@finny.biz.id' 
        AND id = auth.uid()
      )
    );
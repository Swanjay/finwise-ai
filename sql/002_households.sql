-- ============================================
-- FinWise Collaborative Finance Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Households table
CREATE TABLE IF NOT EXISTS households (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Household members table
CREATE TABLE IF NOT EXISTS household_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- 3. Add household_id to transactions (nullable = personal transaction)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_households_invite_code ON households(invite_code);
CREATE INDEX IF NOT EXISTS idx_households_created_by ON households(created_by);
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household_id ON transactions(household_id);

-- 5. Enable RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for households
-- Users can view households they created
CREATE POLICY "Users can view own households" ON households
  FOR SELECT USING (auth.uid() = created_by);

-- Users can view households they are approved member of
CREATE POLICY "Members can view shared households" ON households
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members 
      WHERE household_id = households.id 
      AND user_id = auth.uid() 
      AND status = 'approved'
    )
  );

-- Users can create households
CREATE POLICY "Users can create households" ON households
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Owners can update households
CREATE POLICY "Owners can update households" ON households
  FOR UPDATE USING (auth.uid() = created_by);

-- Owners can delete households
CREATE POLICY "Owners can delete households" ON households
  FOR DELETE USING (auth.uid() = created_by);

-- 7. RLS Policies for household_members
-- Users can view members of their households
CREATE POLICY "Users can view household members" ON household_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM households 
      WHERE id = household_members.household_id 
      AND created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id 
      AND hm.user_id = auth.uid() 
      AND hm.status = 'approved'
    )
  );

-- Users can join households (insert themselves as pending)
CREATE POLICY "Users can join households" ON household_members
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Owners can approve/reject members
CREATE POLICY "Owners can manage members" ON household_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM households 
      WHERE id = household_members.household_id 
      AND created_by = auth.uid()
    )
  );

-- Owners can remove members
CREATE POLICY "Owners can remove members" ON household_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM households 
      WHERE id = household_members.household_id 
      AND created_by = auth.uid()
    )
  );

-- 8. Update transactions RLS to include household access
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Recreate with household support
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM household_members 
      WHERE household_id = transactions.household_id 
      AND user_id = auth.uid() 
      AND status = 'approved'
    )
  );

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND (
      household_id IS NULL 
      OR 
      EXISTS (
        SELECT 1 FROM household_members 
        WHERE household_id = transactions.household_id 
        AND user_id = auth.uid() 
        AND status = 'approved'
      )
    )
  );

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

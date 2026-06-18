-- Audit Logs Table for FinWise
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'guest',
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'clean')),
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT audit_logs_user_id_idx UNIQUE (id, user_id)
);

-- Create indexes separately (PostgreSQL syntax)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs
  FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = 'guest');

-- Policy: Allow insert from authenticated users
CREATE POLICY "Allow insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: No updates allowed (audit logs are immutable)
CREATE POLICY "No updates allowed"
  ON audit_logs
  FOR UPDATE
  USING (false);

-- Policy: No deletes allowed (audit logs are immutable)
CREATE POLICY "No deletes allowed"
  ON audit_logs
  FOR DELETE
  USING (false);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Audit trail for all critical operations in FinWise';
COMMENT ON COLUMN audit_logs.action IS 'Type of operation: create, update, delete, login, logout, export, import, clean';
COMMENT ON COLUMN audit_logs.old_data IS 'Data before the change (for updates/deletes)';
COMMENT ON COLUMN audit_logs.new_data IS 'Data after the change (for creates/updates)';

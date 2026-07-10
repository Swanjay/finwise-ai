-- ============================================================
-- FinWise: Rate Limit + OTP Store (Supabase-backed)
-- Replaces broken in-memory Map (resets on cold start, not shared across serverless instances)
-- ============================================================

-- ─── Rate limit counters ───
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key         TEXT PRIMARY KEY,
  count       INT NOT NULL DEFAULT 1,
  window_start BIGINT NOT NULL,   -- epoch ms of window start
  expires_at  BIGINT NOT NULL     -- epoch ms when this window expires
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON public.rate_limits (expires_at);

-- ─── OTP / login codes (replaces in-memory Map) ───
CREATE TABLE IF NOT EXISTS public.otp_codes (
  identifier  TEXT PRIMARY KEY,    -- email or telegram username (lowercased)
  code        TEXT NOT NULL,
  expires_at  BIGINT NOT NULL,     -- epoch ms
  attempts    INT NOT NULL DEFAULT 0,
  created_at  BIGINT NOT NULL DEFAULT 0,
  user_data   JSONB DEFAULT NULL   -- store telegram user info if needed
);

CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.otp_codes (expires_at);

-- ─── Auto-cleanup: delete expired rows ───
-- Run via pg_cron if available, otherwise app cleans on read.
-- Helper function for atomic rate-limit check:
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_ms BIGINT,
  p_max INT,
  p_now BIGINT
) RETURNS TABLE(allowed BOOLEAN, remaining INT, retry_after BIGINT) AS $$
DECLARE
  v_count INT;
  v_window_start BIGINT;
  v_expires BIGINT;
  v_new_expires BIGINT;
BEGIN
  v_window_start := p_now - (p_now % p_window_ms);
  v_new_expires := v_window_start + p_window_ms;

  -- Clean expired
  DELETE FROM public.rate_limits WHERE expires_at < p_now;

  SELECT count, window_start INTO v_count, v_window_start
  FROM public.rate_limits WHERE key = p_key;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, count, window_start, expires_at)
    VALUES (p_key, 1, v_window_start, v_new_expires)
    ON CONFLICT (key) DO UPDATE SET count = 1, window_start = EXCLUDED.window_start, expires_at = EXCLUDED.expires_at;
    RETURN QUERY SELECT TRUE, (p_max - 1), (v_new_expires - p_now);
    RETURN;
  END IF;

  IF v_count >= p_max THEN
    RETURN QUERY SELECT FALSE, 0, (v_expires - p_now) FROM public.rate_limits WHERE key = p_key;
    RETURN;
  END IF;

  UPDATE public.rate_limits SET count = count + 1, expires_at = v_new_expires WHERE key = p_key;
  SELECT count INTO v_count FROM public.rate_limits WHERE key = p_key;
  RETURN QUERY SELECT TRUE, (p_max - v_count), (v_new_expires - p_now);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS (service role bypasses, anon/authenticated blocked)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can touch these (used server-side in API routes)
CREATE POLICY "service_role_only_rl" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_only_otp" ON public.otp_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── OTP attempt increment (atomic) ───
CREATE OR REPLACE FUNCTION public.otp_increment_attempts(p_identifier TEXT)
RETURNS INT AS $$
DECLARE
  v_attempts INT;
BEGIN
  UPDATE public.otp_codes SET attempts = attempts + 1 WHERE identifier = p_identifier;
  SELECT attempts INTO v_attempts FROM public.otp_codes WHERE identifier = p_identifier;
  RETURN COALESCE(v_attempts, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

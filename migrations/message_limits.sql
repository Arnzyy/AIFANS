-- =====================================================
-- MESSAGE LIMITS SYSTEM
-- Tracks monthly message usage per user/creator
-- Prevents API cost abuse while feeling unlimited
-- =====================================================

-- Monthly message usage tracking
CREATE TABLE IF NOT EXISTS monthly_message_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: "2026-01"

  -- Usage tracking
  messages_used INTEGER DEFAULT 0,
  messages_included INTEGER DEFAULT 100, -- From subscription (£9.99/month)
  messages_purchased INTEGER DEFAULT 0, -- Extra bought with tokens

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique constraint
  UNIQUE(user_id, creator_id, month)
);

-- Index for fast lookups
CREATE INDEX idx_monthly_usage_user_creator_month
ON monthly_message_usage(user_id, creator_id, month);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_monthly_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monthly_usage_timestamp
BEFORE UPDATE ON monthly_message_usage
FOR EACH ROW
EXECUTE FUNCTION update_monthly_usage_timestamp();

-- =====================================================
-- HELPER FUNCTION: Get current month string
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_month()
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(NOW(), 'YYYY-MM');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE monthly_message_usage ENABLE ROW LEVEL SECURITY;

-- Users can read their own usage
CREATE POLICY "Users can read own usage"
ON monthly_message_usage FOR SELECT
USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access"
ON monthly_message_usage FOR ALL
USING (auth.role() = 'service_role');

-- ===========================================
-- FEATURE FLAGS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_name TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags (needed for frontend checks)
CREATE POLICY "Anyone can read feature flags" ON feature_flags
  FOR SELECT USING (true);

-- Only service role can modify (backend only)
CREATE POLICY "Service role can manage feature flags" ON feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- ===========================================
-- SEED DEFAULT FLAGS
-- ===========================================

INSERT INTO feature_flags (flag_name, is_enabled, rollout_percentage, description) VALUES
  ('enhanced_chat_v2', false, 0, 'Enhanced chat system with conversation tracking and smart memory'),
  ('analytics_logging', true, 100, 'Collect message analytics data')
ON CONFLICT (flag_name) DO NOTHING;

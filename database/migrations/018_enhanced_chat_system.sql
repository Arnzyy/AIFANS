-- ===========================================
-- LYRA DATABASE MIGRATIONS - Enhanced Chat System
-- Run these in Supabase SQL Editor
-- ===========================================

-- ===========================================
-- 1. CONVERSATION STATE TABLE
-- Tracks conversation patterns to prevent repetition
-- ===========================================

CREATE TABLE IF NOT EXISTS conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  persona_id UUID NOT NULL,

  -- Pattern tracking
  last_response_ended_with_question BOOLEAN DEFAULT FALSE,
  last_response_length TEXT DEFAULT 'medium' CHECK (last_response_length IN ('short', 'medium', 'long')),
  last_response_started_with TEXT DEFAULT '',
  questions_in_last_5 INTEGER DEFAULT 0,

  -- Heat tracking
  current_heat_level FLOAT DEFAULT 1.0,
  peak_heat_level FLOAT DEFAULT 1.0,

  -- Session tracking
  messages_this_session INTEGER DEFAULT 0,
  session_started_at TIMESTAMPTZ DEFAULT NOW(),

  -- Recent message history (JSON)
  recent_bot_messages JSONB DEFAULT '[]',
  recent_user_messages JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_state_conversation_id ON conversation_state(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_state_user_persona ON conversation_state(user_id, persona_id);


-- ===========================================
-- 2. USER MEMORIES TABLE (Enhanced)
-- Stores remembered facts about users with more categories
-- ===========================================

CREATE TABLE IF NOT EXISTS user_memories_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  persona_id UUID NOT NULL,

  -- Memory content
  category TEXT NOT NULL CHECK (category IN (
    'name', 'age', 'location', 'occupation', 'interests', 'physical',
    'pets', 'favorites', 'relationship', 'goals', 'routine',
    'preferences', 'running_joke', 'recent_event', 'family', 'education'
  )),
  fact TEXT NOT NULL,

  -- Confidence and source
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT DEFAULT 'user_stated' CHECK (source IN ('user_stated', 'inferred', 'corrected')),

  -- Recency tracking
  recency TEXT DEFAULT 'recent' CHECK (recency IN ('recent', 'established', 'old')),
  last_mentioned TIMESTAMPTZ DEFAULT NOW(),
  mention_count INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint per user/persona/category
  UNIQUE(user_id, persona_id, category)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_memories_v2_user_persona ON user_memories_v2(user_id, persona_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_v2_category ON user_memories_v2(category);
CREATE INDEX IF NOT EXISTS idx_user_memories_v2_recency ON user_memories_v2(recency);


-- ===========================================
-- 3. USER PREFERENCES TABLE
-- Learned user behavior patterns
-- ===========================================

CREATE TABLE IF NOT EXISTS user_preferences_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  persona_id UUID NOT NULL,

  -- Message patterns
  avg_message_length FLOAT DEFAULT 50,
  avg_response_time_seconds FLOAT DEFAULT 30,

  -- Session patterns
  avg_session_duration_minutes FLOAT DEFAULT 10,
  avg_messages_per_session FLOAT DEFAULT 15,
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,

  -- Behavioral patterns
  escalation_speed FLOAT DEFAULT 5 CHECK (escalation_speed >= 1 AND escalation_speed <= 10),
  preferred_pace FLOAT DEFAULT 5 CHECK (preferred_pace >= 1 AND preferred_pace <= 10),
  question_tolerance FLOAT DEFAULT 0.5 CHECK (question_tolerance >= 0 AND question_tolerance <= 1),
  emoji_response_rate FLOAT DEFAULT 0.5 CHECK (emoji_response_rate >= 0 AND emoji_response_rate <= 1),

  -- Engagement signals
  avg_heat_level FLOAT DEFAULT 3,
  peak_heat_level FLOAT DEFAULT 3,

  -- Trait resonance
  trait_scores JSONB DEFAULT '{}',

  -- Timing patterns
  typical_active_hours INTEGER[] DEFAULT '{}',
  preferred_day_of_week INTEGER[] DEFAULT '{}',

  -- Response preferences
  preferred_response_length TEXT DEFAULT 'medium' CHECK (preferred_response_length IN ('short', 'medium', 'long')),

  -- Timestamps
  first_interaction TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, persona_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_v2_user_persona ON user_preferences_v2(user_id, persona_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_v2_last_interaction ON user_preferences_v2(last_interaction);


-- ===========================================
-- 4. MESSAGE ANALYTICS TABLE
-- Logs message data for ML training
-- ===========================================

CREATE TABLE IF NOT EXISTS message_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  persona_id UUID NOT NULL,

  -- Message characteristics
  is_user_message BOOLEAN NOT NULL,
  message_length INTEGER NOT NULL,
  heat_level FLOAT NOT NULL,
  ended_with_question BOOLEAN NOT NULL,
  emoji_count INTEGER DEFAULT 0,
  started_with TEXT DEFAULT '',

  -- Response characteristics (for bot messages)
  response_delay_ms INTEGER,

  -- Engagement signals (updated after user responds)
  user_replied BOOLEAN,
  reply_delay_seconds FLOAT,
  reply_length INTEGER,
  session_continued BOOLEAN,
  tip_followed BOOLEAN,

  -- Context at time of message
  session_message_number INTEGER NOT NULL,
  prior_heat_level FLOAT NOT NULL,

  -- A/B test tracking
  ab_test_variant TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_message_analytics_conversation ON message_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_analytics_user_persona ON message_analytics(user_id, persona_id);
CREATE INDEX IF NOT EXISTS idx_message_analytics_created ON message_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_message_analytics_is_user ON message_analytics(is_user_message);
CREATE INDEX IF NOT EXISTS idx_message_analytics_message_id ON message_analytics(message_id);

-- Partial index for engagement analysis
CREATE INDEX IF NOT EXISTS idx_message_analytics_engagement
ON message_analytics(persona_id, created_at)
WHERE is_user_message = FALSE AND user_replied IS NOT NULL;


-- ===========================================
-- 5. FEATURE FLAGS TABLE
-- For toggling between old and new chat system
-- ===========================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the enhanced chat feature flag
INSERT INTO feature_flags (flag_name, is_enabled, rollout_percentage, description)
VALUES ('enhanced_chat_v2', false, 0, 'Toggle between legacy and enhanced chat system')
ON CONFLICT (flag_name) DO NOTHING;


-- ===========================================
-- 6. ENABLE RLS ON ALL NEW TABLES
-- ===========================================

ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;


-- ===========================================
-- 7. SERVICE ROLE POLICIES (Backend Full Access)
-- ===========================================

CREATE POLICY "Service role full access - conversation_state"
ON conversation_state FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - user_memories_v2"
ON user_memories_v2 FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - user_preferences_v2"
ON user_preferences_v2 FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - message_analytics"
ON message_analytics FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - feature_flags"
ON feature_flags FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Public read for feature flags
CREATE POLICY "Public read feature_flags"
ON feature_flags FOR SELECT
USING (true);


-- ===========================================
-- 8. HELPER FUNCTIONS
-- ===========================================

-- Function to update memory recency (run nightly)
CREATE OR REPLACE FUNCTION update_memory_recency_v2()
RETURNS void AS $$
BEGIN
  -- Mark as 'established' if not mentioned in last week
  UPDATE user_memories_v2
  SET recency = 'established', updated_at = NOW()
  WHERE recency = 'recent'
    AND last_mentioned < NOW() - INTERVAL '7 days';

  -- Mark as 'old' if not mentioned in last month
  UPDATE user_memories_v2
  SET recency = 'old', updated_at = NOW()
  WHERE recency = 'established'
    AND last_mentioned < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;


-- ===========================================
-- VERIFICATION
-- ===========================================

-- Run this to verify all tables were created:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'conversation_state',
  'user_memories_v2',
  'user_preferences_v2',
  'message_analytics',
  'feature_flags'
);

-- ===========================================
-- ENHANCED CHAT SYSTEM TABLES
-- For conversation state, memories, preferences, analytics
-- ===========================================

-- ===========================================
-- 1. CONVERSATION STATE
-- Tracks patterns to prevent repetition
-- ===========================================

CREATE TABLE IF NOT EXISTS conversation_state (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL,

  -- Pattern tracking
  last_response_ended_with_question BOOLEAN DEFAULT false,
  last_response_length TEXT DEFAULT 'medium' CHECK (last_response_length IN ('short', 'medium', 'long')),
  last_response_started_with TEXT DEFAULT '',
  questions_in_last_5 INTEGER DEFAULT 0,

  -- Heat tracking
  current_heat_level NUMERIC(3,1) DEFAULT 1.0,
  peak_heat_level NUMERIC(3,1) DEFAULT 1.0,

  -- Session tracking
  messages_this_session INTEGER DEFAULT 0,
  session_started_at TIMESTAMPTZ DEFAULT now(),

  -- Recent messages (JSON arrays)
  recent_bot_messages JSONB DEFAULT '[]'::jsonb,
  recent_user_messages JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_state_user ON conversation_state(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_state_persona ON conversation_state(persona_id);

-- ===========================================
-- 2. USER MEMORIES V2
-- Smarter memory storage with categories
-- ===========================================

CREATE TABLE IF NOT EXISTS user_memories_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL,

  category TEXT NOT NULL CHECK (category IN (
    'name', 'age', 'location', 'occupation', 'interests', 'physical',
    'pets', 'favorites', 'relationship', 'goals', 'routine',
    'preferences', 'running_joke', 'recent_event', 'family', 'education'
  )),
  fact TEXT NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT DEFAULT 'user_stated' CHECK (source IN ('user_stated', 'inferred', 'corrected')),
  recency TEXT DEFAULT 'recent' CHECK (recency IN ('recent', 'established', 'old')),

  last_mentioned TIMESTAMPTZ DEFAULT now(),
  mention_count INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, persona_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_memories_v2_user_persona ON user_memories_v2(user_id, persona_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_v2_category ON user_memories_v2(category);

-- ===========================================
-- 3. USER PREFERENCES V2
-- Learned user communication preferences
-- ===========================================

CREATE TABLE IF NOT EXISTS user_preferences_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL,

  -- Message patterns
  avg_message_length NUMERIC(6,1) DEFAULT 0,
  prefers_short_responses BOOLEAN DEFAULT false,
  prefers_emojis BOOLEAN DEFAULT true,
  emoji_frequency NUMERIC(3,2) DEFAULT 0.5,

  -- Engagement patterns
  avg_response_time_seconds NUMERIC(8,2) DEFAULT 0,
  avg_session_length INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,

  -- Heat patterns
  avg_heat_level NUMERIC(3,1) DEFAULT 3.0,
  peak_heat_reached NUMERIC(3,1) DEFAULT 3.0,

  -- Question patterns
  asks_questions_frequently BOOLEAN DEFAULT false,
  question_ratio NUMERIC(3,2) DEFAULT 0.3,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_v2_user_persona ON user_preferences_v2(user_id, persona_id);

-- ===========================================
-- 4. MESSAGE ANALYTICS
-- For A/B testing and engagement tracking
-- ===========================================

CREATE TABLE IF NOT EXISTS message_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL,

  -- Message metadata
  is_user_message BOOLEAN NOT NULL,
  message_length INTEGER NOT NULL,
  heat_level NUMERIC(3,1),
  ended_with_question BOOLEAN DEFAULT false,
  emoji_count INTEGER DEFAULT 0,
  started_with TEXT,

  -- Session context
  session_message_number INTEGER DEFAULT 0,
  prior_heat_level NUMERIC(3,1),

  -- A/B testing
  ab_test_variant TEXT,

  -- Engagement (for bot messages)
  user_replied BOOLEAN,
  reply_delay_seconds NUMERIC(8,2),
  reply_length INTEGER,
  session_continued BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_analytics_conversation ON message_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_analytics_user ON message_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_message_analytics_ab_test ON message_analytics(ab_test_variant) WHERE ab_test_variant IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_analytics_created ON message_analytics(created_at);

-- ===========================================
-- 5. RLS POLICIES
-- ===========================================

ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_analytics ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own data
CREATE POLICY "Users can manage their conversation state"
  ON conversation_state FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their memories"
  ON user_memories_v2 FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their preferences"
  ON user_preferences_v2 FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their analytics"
  ON message_analytics FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access to conversation_state"
  ON conversation_state FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to user_memories_v2"
  ON user_memories_v2 FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to user_preferences_v2"
  ON user_preferences_v2 FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to message_analytics"
  ON message_analytics FOR ALL
  USING (auth.role() = 'service_role');

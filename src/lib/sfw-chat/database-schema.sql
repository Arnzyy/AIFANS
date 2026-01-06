-- ===========================================
-- SFW / COMPANION CHAT DATABASE SCHEMA
-- COMPLETELY SEPARATE FROM NSFW TABLES
-- DO NOT MODIFY EXISTING NSFW TABLES
-- ===========================================

-- =====================
-- 1. CREATOR CHAT MODE SETTINGS
-- Controls which modes are enabled per creator
-- =====================

CREATE TABLE IF NOT EXISTS creator_chat_modes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Mode toggles
  nsfw_enabled BOOLEAN DEFAULT true,  -- Existing NSFW (default on for backwards compat)
  sfw_enabled BOOLEAN DEFAULT false,  -- New SFW mode (default off)

  -- Default mode when both enabled
  default_mode VARCHAR(10) DEFAULT 'nsfw' CHECK (default_mode IN ('nsfw', 'sfw')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_modes_creator ON creator_chat_modes(creator_id);

-- =====================
-- 2. SFW AI PERSONALITY CONFIG
-- Separate from ai_personalities (NSFW) table
-- =====================

CREATE TABLE IF NOT EXISTS sfw_ai_personalities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Enable/disable
  enabled BOOLEAN DEFAULT false,

  -- Identity (separate from NSFW persona)
  persona_name VARCHAR(100) NOT NULL DEFAULT 'My AI',
  persona_age INTEGER NOT NULL DEFAULT 21 CHECK (persona_age >= 18 AND persona_age <= 100),
  backstory TEXT,

  -- SFW-safe personality traits
  personality_traits TEXT[] DEFAULT '{}',

  -- Flirt level (SFW specific)
  flirt_level VARCHAR(20) DEFAULT 'light_flirty'
    CHECK (flirt_level IN ('friendly', 'light_flirty', 'romantic')),

  -- Safe interests
  interests TEXT[] DEFAULT '{}',

  -- Turn ons/offs (kept tasteful)
  turn_ons TEXT,
  turn_offs TEXT,

  -- Response style
  response_length VARCHAR(20) DEFAULT 'medium',
  emoji_usage VARCHAR(20) DEFAULT 'some',

  -- Pricing (separate from NSFW pricing)
  pricing_model VARCHAR(20) DEFAULT 'included'
    CHECK (pricing_model IN ('included', 'per_message')),
  price_per_message DECIMAL(10,2) DEFAULT 0.25,

  -- Physical traits (SFW-safe subset)
  physical_traits JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sfw_personalities_creator ON sfw_ai_personalities(creator_id);

-- =====================
-- 3. SFW CHAT THREADS
-- Separate from NSFW conversations
-- =====================

CREATE TABLE IF NOT EXISTS sfw_chat_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),

  -- One thread per creator-subscriber pair for SFW mode
  UNIQUE(creator_id, subscriber_id)
);

CREATE INDEX idx_sfw_threads_creator ON sfw_chat_threads(creator_id);
CREATE INDEX idx_sfw_threads_subscriber ON sfw_chat_threads(subscriber_id);

-- =====================
-- 4. SFW CHAT MESSAGES
-- Separate from NSFW messages
-- =====================

CREATE TABLE IF NOT EXISTS sfw_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES sfw_chat_threads(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id),

  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,

  -- Cost tracking (if per-message pricing)
  cost DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sfw_messages_thread ON sfw_chat_messages(thread_id);
CREATE INDEX idx_sfw_messages_created ON sfw_chat_messages(created_at DESC);

-- =====================
-- 5. SFW USER MEMORY
-- Separate from NSFW memory (safe facts only)
-- =====================

CREATE TABLE IF NOT EXISTS sfw_user_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id),
  creator_id UUID NOT NULL REFERENCES auth.users(id),

  -- Safe facts only
  preferred_name VARCHAR(50),
  interests TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',

  -- Meta
  message_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One memory record per subscriber-creator pair
  UNIQUE(subscriber_id, creator_id)
);

CREATE INDEX idx_sfw_memory_subscriber ON sfw_user_memory(subscriber_id);
CREATE INDEX idx_sfw_memory_creator ON sfw_user_memory(creator_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE creator_chat_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfw_ai_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfw_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfw_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfw_user_memory ENABLE ROW LEVEL SECURITY;

-- Chat modes: creators manage their own
CREATE POLICY "Creators manage own chat modes"
  ON creator_chat_modes FOR ALL
  USING (auth.uid() = creator_id);

-- SFW personalities: creators manage their own
CREATE POLICY "Creators manage own SFW AI"
  ON sfw_ai_personalities FOR ALL
  USING (auth.uid() = creator_id);

-- Subscribers can view SFW personalities (for chat)
CREATE POLICY "Subscribers can view SFW AI personalities"
  ON sfw_ai_personalities FOR SELECT
  USING (true);

-- SFW threads: participants only
CREATE POLICY "SFW thread participants access"
  ON sfw_chat_threads FOR ALL
  USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);

-- SFW messages: participants only
CREATE POLICY "SFW message participants access"
  ON sfw_chat_messages FOR ALL
  USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);

-- SFW memory: subscribers can view/delete own, creators can read
CREATE POLICY "Subscribers manage own SFW memory"
  ON sfw_user_memory FOR ALL
  USING (auth.uid() = subscriber_id);

CREATE POLICY "Creators can read subscriber SFW memory"
  ON sfw_user_memory FOR SELECT
  USING (auth.uid() = creator_id);

-- =====================
-- TRIGGERS
-- =====================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sfw_ai_personalities_updated
  BEFORE UPDATE ON sfw_ai_personalities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER creator_chat_modes_updated
  BEFORE UPDATE ON creator_chat_modes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sfw_user_memory_updated
  BEFORE UPDATE ON sfw_user_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

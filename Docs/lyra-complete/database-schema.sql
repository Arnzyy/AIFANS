-- ===========================================
-- LYRA SAFE MEMORY SYSTEM DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ===========================================

-- =====================
-- 1. CHAT MESSAGES TABLE
-- Full message history
-- =====================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- For efficient retrieval
  CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) 
    REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_subscriber ON chat_messages(subscriber_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- =====================
-- 2. USER MEMORY TABLE
-- Structured facts/preferences ONLY (allowed list)
-- =====================

CREATE TABLE IF NOT EXISTS user_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Safe facts only (see MEMORY_RULES.allowed)
  preferred_name VARCHAR(50),
  interests TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  -- preferences structure:
  -- {
  --   "reply_length": "short" | "medium" | "long",
  --   "emoji_tolerance": "none" | "some" | "lots",
  --   "tone": "playful" | "direct" | "romantic" | "teasing",
  --   "topics_enjoyed": ["gym", "music", "cars"],
  --   "topics_avoided": ["politics", "exes"],
  --   "pace": "slow_burn" | "direct"
  -- }
  
  running_jokes TEXT[] DEFAULT '{}',
  neutral_topics TEXT[] DEFAULT '{}', -- Things mentioned (not emotional)
  
  -- Meta
  message_count INTEGER DEFAULT 0,
  last_interaction TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One memory record per subscriber-creator pair
  UNIQUE(subscriber_id, creator_id)
);

CREATE INDEX idx_user_memory_subscriber ON user_memory(subscriber_id);
CREATE INDEX idx_user_memory_creator ON user_memory(creator_id);

-- =====================
-- 3. CONVERSATION CONTEXT SUMMARY
-- Neutral summary for continuity (no relationship language)
-- =====================

CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES auth.users(id),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Neutral summary (AI-generated, reviewed for compliance)
  summary TEXT NOT NULL,
  -- Example: "User enjoys gym talk, prefers playful tone, mentioned work project"
  -- NOT: "User and AI have been building a close relationship over 3 weeks"
  
  -- Last topics discussed (for continuity)
  recent_topics TEXT[] DEFAULT '{}',
  
  -- Meta
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(subscriber_id, creator_id)
);

-- =====================
-- 4. CONVERSATIONS TABLE
-- Track individual chat sessions
-- =====================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(creator_id, subscriber_id)
);

CREATE INDEX idx_conversations_creator ON conversations(creator_id);
CREATE INDEX idx_conversations_subscriber ON conversations(subscriber_id);

-- =====================
-- 5. USER MEMORY SETTINGS
-- User controls for privacy
-- =====================

CREATE TABLE IF NOT EXISTS memory_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  
  -- Controls
  memory_enabled BOOLEAN DEFAULT true,
  
  -- Consent
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 6. TOPIC EMBEDDINGS (OPTIONAL)
-- For semantic retrieval of relevant past content
-- =====================

CREATE TABLE IF NOT EXISTS topic_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  
  -- The text chunk that was embedded
  content_chunk TEXT NOT NULL,
  
  -- Vector embedding (requires pgvector extension)
  -- embedding vector(1536), -- Uncomment if using pgvector
  
  -- Metadata
  topic_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_embeddings ENABLE ROW LEVEL SECURITY;

-- Chat messages: users can see their own conversations
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);

-- Memory: users can view/manage their own memory
CREATE POLICY "Users can view own memory"
  ON user_memory FOR SELECT
  USING (auth.uid() = subscriber_id);

CREATE POLICY "Users can delete own memory"
  ON user_memory FOR DELETE
  USING (auth.uid() = subscriber_id);

-- Creators can read subscriber memory for their personas
CREATE POLICY "Creators can read subscriber memory"
  ON user_memory FOR SELECT
  USING (auth.uid() = creator_id);

-- Memory settings: users control their own
CREATE POLICY "Users manage own memory settings"
  ON memory_settings FOR ALL
  USING (auth.uid() = user_id);

-- Conversations: participants only
CREATE POLICY "Conversation participants access"
  ON conversations FOR ALL
  USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);

-- =====================
-- FUNCTIONS
-- =====================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_memory_updated
  BEFORE UPDATE ON user_memory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER memory_settings_updated
  BEFORE UPDATE ON memory_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to clear user memory (for "Clear Memory" feature)
CREATE OR REPLACE FUNCTION clear_user_memory(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete memory records
  DELETE FROM user_memory WHERE subscriber_id = p_user_id;
  DELETE FROM conversation_summaries WHERE subscriber_id = p_user_id;
  
  -- Keep messages but they won't be used for memory
  -- (User may want to keep chat history separate from memory)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

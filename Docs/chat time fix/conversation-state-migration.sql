-- ============================================
-- CONVERSATION STATE ENHANCEMENTS
-- Adds time awareness and session memory
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ADD NEW COLUMNS TO CONVERSATION_STATE
-- ============================================

-- Add last_message_at for time tracking
ALTER TABLE conversation_state
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();

-- Add session_summary for context between sessions
ALTER TABLE conversation_state
ADD COLUMN IF NOT EXISTS session_summary TEXT;

-- Add user_facts for storing learned information
ALTER TABLE conversation_state
ADD COLUMN IF NOT EXISTS user_facts JSONB DEFAULT '[]'::jsonb;

-- Add conversation_topics for tracking what they enjoy
ALTER TABLE conversation_state
ADD COLUMN IF NOT EXISTS conversation_topics JSONB DEFAULT '[]'::jsonb;

-- Add message_count for relationship depth tracking
ALTER TABLE conversation_state
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Add total_sessions for tracking engagement
ALTER TABLE conversation_state
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 1;

-- Add last_session_end for session tracking
ALTER TABLE conversation_state
ADD COLUMN IF NOT EXISTS last_session_end TIMESTAMPTZ;

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for fast lookups by user and model
CREATE INDEX IF NOT EXISTS idx_conversation_state_user_model 
ON conversation_state(user_id, model_id);

-- Index for finding recent conversations
CREATE INDEX IF NOT EXISTS idx_conversation_state_last_message 
ON conversation_state(last_message_at DESC);

-- ============================================
-- 3. BACKFILL EXISTING CONVERSATIONS
-- ============================================

-- Set last_message_at from updated_at for existing rows
UPDATE conversation_state 
SET last_message_at = COALESCE(updated_at, created_at, now())
WHERE last_message_at IS NULL;

-- Set message_count estimate from existing data if available
-- (This is a rough estimate - actual count would need message table join)
UPDATE conversation_state 
SET message_count = 1
WHERE message_count IS NULL OR message_count = 0;

-- ============================================
-- 4. VERIFY SCHEMA
-- ============================================

SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'conversation_state'
ORDER BY ordinal_position;

-- ============================================
-- 5. CHECK FOR EXISTING DATA
-- ============================================

SELECT 
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN last_message_at IS NOT NULL THEN 1 END) as with_last_message,
  COUNT(CASE WHEN user_facts IS NOT NULL AND user_facts != '[]' THEN 1 END) as with_facts,
  COUNT(CASE WHEN message_count > 0 THEN 1 END) as with_message_count
FROM conversation_state;

-- ============================================
-- 6. SAMPLE: VIEW RECENT CONVERSATIONS
-- ============================================

SELECT 
  id,
  user_id,
  model_id,
  last_message_at,
  message_count,
  user_facts,
  session_summary
FROM conversation_state
ORDER BY last_message_at DESC
LIMIT 10;

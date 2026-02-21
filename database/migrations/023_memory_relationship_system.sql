-- ===========================================
-- LYRA DATABASE MIGRATIONS - Memory & Relationship System
-- Migration 023: Adds relationship stages, welcome-back logging, memory enhancements
-- Run these in Supabase SQL Editor
-- ===========================================


-- ===========================================
-- 1. RELATIONSHIP STATES TABLE
-- Tracks subscriber-creator relationship progression
-- ===========================================

CREATE TABLE IF NOT EXISTS relationship_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL,
  creator_id UUID NOT NULL,

  -- Relationship stage: new (0-49 msgs), familiar (50-199), intimate (200+)
  stage VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'familiar', 'intimate')),

  -- Counters
  total_messages INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  first_message_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One relationship state per subscriber-creator pair
  UNIQUE(subscriber_id, creator_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_relationship_states_subscriber
  ON relationship_states(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_relationship_states_creator
  ON relationship_states(creator_id);
CREATE INDEX IF NOT EXISTS idx_relationship_states_pair
  ON relationship_states(subscriber_id, creator_id);
CREATE INDEX IF NOT EXISTS idx_relationship_states_stage
  ON relationship_states(stage);


-- ===========================================
-- 2. WELCOME BACK LOG TABLE
-- Tracks welcome-back messages for cooldown and analytics
-- ===========================================

CREATE TABLE IF NOT EXISTS welcome_back_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL,
  creator_id UUID NOT NULL,

  -- Message details
  message TEXT NOT NULL,
  gap_hours NUMERIC(10,2) NOT NULL,
  memories_used JSONB DEFAULT '[]',
  relationship_stage VARCHAR(20),

  -- Timestamp for cooldown checks
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cooldown check (most recent welcome-back per pair)
CREATE INDEX IF NOT EXISTS idx_welcome_back_log_recent
  ON welcome_back_log(subscriber_id, creator_id, created_at DESC);


-- ===========================================
-- 3. ADD EMOTIONAL_WEIGHT TO MEMORIES
-- Maps to spec's scoring system (1-10)
-- ===========================================

ALTER TABLE user_memories_v2
ADD COLUMN IF NOT EXISTS emotional_weight SMALLINT DEFAULT 5
CHECK (emotional_weight BETWEEN 1 AND 10);

-- Backfill existing memories: convert confidence + recency to emotional_weight
UPDATE user_memories_v2
SET emotional_weight = CASE
  WHEN confidence >= 0.9 AND recency = 'recent' THEN 8
  WHEN confidence >= 0.8 AND recency = 'recent' THEN 7
  WHEN confidence >= 0.8 THEN 6
  WHEN recency = 'recent' THEN 5
  WHEN recency = 'established' THEN 4
  ELSE 3
END
WHERE emotional_weight = 5 OR emotional_weight IS NULL;


-- ===========================================
-- 4. RLS POLICIES
-- ===========================================

ALTER TABLE relationship_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE welcome_back_log ENABLE ROW LEVEL SECURITY;

-- Service role full access for backend operations
CREATE POLICY "Service role full access - relationship_states"
ON relationship_states FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - welcome_back_log"
ON welcome_back_log FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Users can read their own relationship states (for future profile features)
CREATE POLICY "Users can read own relationship states"
ON relationship_states FOR SELECT
USING (auth.uid() = subscriber_id);


-- ===========================================
-- 5. RPC FUNCTIONS
-- ===========================================

-- Increment message count and auto-calculate stage
CREATE OR REPLACE FUNCTION increment_relationship_message(
  p_subscriber_id UUID,
  p_creator_id UUID
) RETURNS relationship_states AS $$
DECLARE
  result relationship_states;
  new_count INTEGER;
  new_stage VARCHAR(20);
BEGIN
  -- Upsert: insert or update
  INSERT INTO relationship_states (subscriber_id, creator_id, total_messages)
  VALUES (p_subscriber_id, p_creator_id, 1)
  ON CONFLICT (subscriber_id, creator_id)
  DO UPDATE SET
    total_messages = relationship_states.total_messages + 1,
    updated_at = NOW()
  RETURNING total_messages INTO new_count;

  -- Calculate stage based on message count
  new_stage := CASE
    WHEN new_count >= 200 THEN 'intimate'
    WHEN new_count >= 50 THEN 'familiar'
    ELSE 'new'
  END;

  -- Update stage if changed
  UPDATE relationship_states
  SET stage = new_stage, updated_at = NOW()
  WHERE subscriber_id = p_subscriber_id
    AND creator_id = p_creator_id
    AND stage != new_stage
  RETURNING * INTO result;

  -- If stage didn't change, get the current state
  IF result IS NULL THEN
    SELECT * INTO result
    FROM relationship_states
    WHERE subscriber_id = p_subscriber_id AND creator_id = p_creator_id;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Increment session count (called on welcome-back)
CREATE OR REPLACE FUNCTION increment_relationship_session(
  p_subscriber_id UUID,
  p_creator_id UUID
) RETURNS relationship_states AS $$
DECLARE
  result relationship_states;
BEGIN
  INSERT INTO relationship_states (subscriber_id, creator_id, total_sessions)
  VALUES (p_subscriber_id, p_creator_id, 1)
  ON CONFLICT (subscriber_id, creator_id)
  DO UPDATE SET
    total_sessions = relationship_states.total_sessions + 1,
    updated_at = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Check welcome-back cooldown (30 min)
CREATE OR REPLACE FUNCTION check_welcome_back_cooldown(
  p_subscriber_id UUID,
  p_creator_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  last_welcome TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO last_welcome
  FROM welcome_back_log
  WHERE subscriber_id = p_subscriber_id
    AND creator_id = p_creator_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- No previous welcome-back = no cooldown
  IF last_welcome IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Cooldown if last welcome-back was within 30 minutes
  RETURN last_welcome > NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================
-- 6. MEMORY DECAY (LAZY EVALUATION HELPER)
-- Called during retrieval to mark decayed memories
-- ===========================================

CREATE OR REPLACE FUNCTION apply_memory_decay(
  p_user_id UUID,
  p_persona_id UUID
) RETURNS INTEGER AS $$
DECLARE
  decayed_count INTEGER := 0;
BEGIN
  -- Low-weight memories (1-3), no references, >30 days → mark old
  UPDATE user_memories_v2
  SET recency = 'old', updated_at = NOW()
  WHERE user_id = p_user_id
    AND persona_id = p_persona_id
    AND emotional_weight <= 3
    AND mention_count <= 1
    AND last_mentioned < NOW() - INTERVAL '30 days'
    AND recency != 'old';
  GET DIAGNOSTICS decayed_count = ROW_COUNT;

  -- Medium-weight memories (4-5), no references, >90 days → mark old
  UPDATE user_memories_v2
  SET recency = 'old', updated_at = NOW()
  WHERE user_id = p_user_id
    AND persona_id = p_persona_id
    AND emotional_weight BETWEEN 4 AND 5
    AND mention_count <= 1
    AND last_mentioned < NOW() - INTERVAL '90 days'
    AND recency != 'old';
  GET DIAGNOSTICS decayed_count = decayed_count + ROW_COUNT;

  -- High-weight memories (6+) → NEVER auto-decay

  RETURN decayed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===========================================
-- 7. VERIFICATION
-- ===========================================

-- Run this to verify all tables and functions were created:
SELECT 'Tables:' AS check_type, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('relationship_states', 'welcome_back_log');

SELECT 'Columns:' AS check_type, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_memories_v2'
  AND column_name = 'emotional_weight';

SELECT 'Functions:' AS check_type, routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'increment_relationship_message',
    'increment_relationship_session',
    'check_welcome_back_cooldown',
    'apply_memory_decay'
  );

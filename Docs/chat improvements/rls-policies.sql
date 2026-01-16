-- ===========================================
-- LYRA ROW LEVEL SECURITY POLICIES
-- Run AFTER migrations.sql
-- ===========================================
-- 
-- IMPORTANT: Adjust table/column names to match your schema:
-- - 'personas' table might be named differently
-- - 'creator_id' column might be named differently  
-- - 'admins' table might not exist (create it or use Option 2)
--
-- ===========================================


-- ===========================================
-- 1. ENABLE RLS ON ALL NEW TABLES
-- ===========================================

ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;


-- ===========================================
-- 2. SERVICE ROLE POLICIES (Backend Full Access)
-- Your server uses service_role key - needs full access
-- ===========================================

CREATE POLICY "Service role full access - conversation_state" 
ON conversation_state FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - user_memories" 
ON user_memories FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - user_preferences" 
ON user_preferences FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - message_analytics" 
ON message_analytics FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - conversation_embeddings" 
ON conversation_embeddings FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - ab_tests" 
ON ab_tests FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access - ab_test_assignments" 
ON ab_test_assignments FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');


-- ===========================================
-- 3. CREATOR POLICIES (Read Own Persona Data Only)
-- Creators can view analytics for personas they own
-- ===========================================

-- Creators see analytics for their personas only
CREATE POLICY "Creators see own persona analytics" 
ON message_analytics FOR SELECT 
USING (
  persona_id IN (
    SELECT id FROM personas WHERE creator_id = auth.uid()
  )
);

-- Creators see user preference patterns for their personas
CREATE POLICY "Creators see own persona user_preferences" 
ON user_preferences FOR SELECT 
USING (
  persona_id IN (
    SELECT id FROM personas WHERE creator_id = auth.uid()
  )
);

-- Creators see conversation state for their personas
CREATE POLICY "Creators see own persona conversation_state" 
ON conversation_state FOR SELECT 
USING (
  persona_id IN (
    SELECT id FROM personas WHERE creator_id = auth.uid()
  )
);

-- Creators DO NOT see:
-- - user_memories (contains personal user data)
-- - conversation_embeddings (contains conversation content)
-- - ab_tests (admin only)
-- - ab_test_assignments (admin only)


-- ===========================================
-- 4. ADMIN POLICIES (Full Read Access)
-- Choose ONE option below based on your setup
-- ===========================================

-- -----------------------------------------
-- OPTION A: Using an 'admins' table
-- Create this table if it doesn't exist:
-- 
-- CREATE TABLE IF NOT EXISTS admins (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES auth.users(id),
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   UNIQUE(user_id)
-- );
-- -----------------------------------------

CREATE POLICY "Admins see all message_analytics" 
ON message_analytics FOR SELECT 
USING (
  auth.uid() IN (SELECT user_id FROM admins)
);

CREATE POLICY "Admins see all user_preferences" 
ON user_preferences FOR SELECT 
USING (
  auth.uid() IN (SELECT user_id FROM admins)
);

CREATE POLICY "Admins see all user_memories" 
ON user_memories FOR SELECT 
USING (
  auth.uid() IN (SELECT user_id FROM admins)
);

CREATE POLICY "Admins see all conversation_state" 
ON conversation_state FOR SELECT 
USING (
  auth.uid() IN (SELECT user_id FROM admins)
);

CREATE POLICY "Admins see all conversation_embeddings" 
ON conversation_embeddings FOR SELECT 
USING (
  auth.uid() IN (SELECT user_id FROM admins)
);

CREATE POLICY "Admins manage ab_tests" 
ON ab_tests FOR ALL 
USING (
  auth.uid() IN (SELECT user_id FROM admins)
);

CREATE POLICY "Admins manage ab_test_assignments" 
ON ab_test_assignments FOR ALL 
USING (
  auth.uid() IN (SELECT user_id FROM admins)
);

-- -----------------------------------------
-- OPTION B: Using JWT custom claims (alternative)
-- Uncomment these and comment out Option A if preferred
-- Requires setting 'role': 'admin' in user's JWT claims
-- -----------------------------------------

-- CREATE POLICY "Admins see all message_analytics" 
-- ON message_analytics FOR SELECT 
-- USING (auth.jwt() ->> 'role' = 'admin');

-- (repeat for other tables...)


-- ===========================================
-- 5. AGGREGATED VIEWS FOR CREATORS
-- Creators see stats, NOT raw user data
-- ===========================================

-- Main stats view for creator dashboard
CREATE OR REPLACE VIEW creator_persona_stats AS
SELECT 
  p.id as persona_id,
  p.creator_id,
  p.persona_name,
  
  -- Conversation metrics
  COUNT(DISTINCT ma.conversation_id) as total_conversations,
  COUNT(DISTINCT ma.user_id) as unique_users,
  COUNT(ma.id) as total_messages,
  
  -- Response metrics
  ROUND(AVG(ma.message_length) FILTER (WHERE ma.is_user_message = false)::numeric, 1) as avg_bot_response_length,
  ROUND(AVG(ma.message_length) FILTER (WHERE ma.is_user_message = true)::numeric, 1) as avg_user_message_length,
  
  -- Heat metrics
  ROUND(AVG(ma.heat_level)::numeric, 2) as avg_heat_level,
  ROUND(MAX(ma.heat_level)::numeric, 2) as peak_heat_level,
  
  -- Engagement metrics
  ROUND(
    (COUNT(*) FILTER (WHERE ma.user_replied = true)::float / 
    NULLIF(COUNT(*) FILTER (WHERE ma.is_user_message = false), 0) * 100)::numeric, 
    1
  ) as engagement_rate_percent,
  
  -- Response speed
  ROUND(AVG(ma.reply_delay_seconds) FILTER (WHERE ma.user_replied = true)::numeric, 1) as avg_reply_speed_seconds,
  
  -- Question patterns
  ROUND(
    (COUNT(*) FILTER (WHERE ma.ended_with_question = true AND ma.is_user_message = false)::float /
    NULLIF(COUNT(*) FILTER (WHERE ma.is_user_message = false), 0) * 100)::numeric,
    1
  ) as question_rate_percent,
  
  -- Time range
  MIN(ma.created_at) as first_message_at,
  MAX(ma.created_at) as last_message_at

FROM personas p
LEFT JOIN message_analytics ma ON ma.persona_id = p.id
GROUP BY p.id, p.creator_id, p.persona_name;


-- Daily stats view for trending
CREATE OR REPLACE VIEW creator_persona_daily_stats AS
SELECT 
  p.id as persona_id,
  p.creator_id,
  DATE(ma.created_at) as stat_date,
  
  COUNT(DISTINCT ma.conversation_id) as conversations,
  COUNT(DISTINCT ma.user_id) as unique_users,
  COUNT(ma.id) as messages,
  ROUND(AVG(ma.heat_level)::numeric, 2) as avg_heat,
  ROUND(
    (COUNT(*) FILTER (WHERE ma.user_replied = true)::float / 
    NULLIF(COUNT(*) FILTER (WHERE ma.is_user_message = false), 0) * 100)::numeric, 
    1
  ) as engagement_rate

FROM personas p
LEFT JOIN message_analytics ma ON ma.persona_id = p.id
WHERE ma.created_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, p.creator_id, DATE(ma.created_at);


-- Session stats view
CREATE OR REPLACE VIEW creator_session_stats AS
SELECT 
  p.id as persona_id,
  p.creator_id,
  
  ROUND(AVG(up.avg_session_duration_minutes)::numeric, 1) as avg_session_minutes,
  ROUND(AVG(up.avg_messages_per_session)::numeric, 1) as avg_messages_per_session,
  ROUND(AVG(up.escalation_speed)::numeric, 1) as avg_user_escalation_speed,
  ROUND(AVG(up.emoji_response_rate * 100)::numeric, 1) as emoji_usage_percent,
  
  SUM(up.total_sessions) as total_sessions,
  SUM(up.total_messages) as total_messages

FROM personas p
LEFT JOIN user_preferences up ON up.persona_id = p.id
GROUP BY p.id, p.creator_id;


-- ===========================================
-- 6. SECURE THE VIEWS
-- ===========================================

-- Enable RLS on views (Postgres 15+)
-- If on older version, secure via function-based access instead

ALTER VIEW creator_persona_stats SET (security_invoker = on);
ALTER VIEW creator_persona_daily_stats SET (security_invoker = on);
ALTER VIEW creator_session_stats SET (security_invoker = on);


-- ===========================================
-- 7. HELPER FUNCTIONS FOR CREATOR DASHBOARD
-- ===========================================

-- Function: Get creator's persona performance summary
CREATE OR REPLACE FUNCTION get_creator_dashboard_stats(p_creator_id UUID)
RETURNS TABLE (
  persona_id UUID,
  persona_name TEXT,
  total_conversations BIGINT,
  unique_users BIGINT,
  engagement_rate NUMERIC,
  avg_heat NUMERIC,
  avg_session_minutes NUMERIC
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the requester is the creator or an admin
  IF auth.uid() != p_creator_id AND auth.uid() NOT IN (SELECT user_id FROM admins) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    cps.persona_id,
    cps.persona_name,
    cps.total_conversations,
    cps.unique_users,
    cps.engagement_rate_percent as engagement_rate,
    cps.avg_heat_level as avg_heat,
    css.avg_session_minutes
  FROM creator_persona_stats cps
  LEFT JOIN creator_session_stats css ON css.persona_id = cps.persona_id
  WHERE cps.creator_id = p_creator_id;
END;
$$ LANGUAGE plpgsql;


-- Function: Get daily trend for a persona
CREATE OR REPLACE FUNCTION get_persona_daily_trend(
  p_persona_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  stat_date DATE,
  conversations BIGINT,
  unique_users BIGINT,
  messages BIGINT,
  engagement_rate NUMERIC,
  avg_heat NUMERIC
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Get creator_id for this persona
  SELECT creator_id INTO v_creator_id FROM personas WHERE id = p_persona_id;
  
  -- Verify access
  IF auth.uid() != v_creator_id AND auth.uid() NOT IN (SELECT user_id FROM admins) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    cpds.stat_date,
    cpds.conversations,
    cpds.unique_users,
    cpds.messages,
    cpds.engagement_rate,
    cpds.avg_heat
  FROM creator_persona_daily_stats cpds
  WHERE cpds.persona_id = p_persona_id
  AND cpds.stat_date > CURRENT_DATE - p_days
  ORDER BY cpds.stat_date DESC;
END;
$$ LANGUAGE plpgsql;


-- ===========================================
-- 8. VERIFICATION QUERY
-- Run this to verify policies were created
-- ===========================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
  'conversation_state',
  'user_memories',
  'user_preferences', 
  'message_analytics',
  'conversation_embeddings',
  'ab_tests',
  'ab_test_assignments'
)
ORDER BY tablename, policyname;

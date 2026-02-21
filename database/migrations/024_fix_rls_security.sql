-- ===========================================
-- Migration: 024_fix_rls_security.sql
-- CRITICAL SECURITY FIX: Remove USING(true) policies
-- These policies allowed ANY authenticated user to access ALL records
-- Service role bypasses RLS entirely, so these policies are unnecessary
-- ===========================================

-- ===========================================
-- 1. FIX: user_memory table (005_memory_tables.sql)
-- ===========================================
-- Drop the overly permissive "Service can manage memory" policy
DROP POLICY IF EXISTS "Service can manage memory" ON user_memory;

-- Creators can also view memory for their subscribers (needed for AI chat)
DO $$ BEGIN
  CREATE POLICY "Creators can view subscriber memory" ON user_memory
    FOR SELECT USING (creator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 2. FIX: conversation_summaries table (005_memory_tables.sql)
-- ===========================================
-- Drop the overly permissive "Service can manage summaries" policy
DROP POLICY IF EXISTS "Service can manage summaries" ON conversation_summaries;

-- Creators can view summaries for their subscribers (needed for AI context)
DO $$ BEGIN
  CREATE POLICY "Creators can view subscriber summaries" ON conversation_summaries
    FOR SELECT USING (creator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 3. FIX: chat_messages table (011_chat_messages_table.sql)
-- ===========================================
-- Drop the overly permissive "Service can manage chat messages" policy
DROP POLICY IF EXISTS "Service can manage chat messages" ON chat_messages;

-- Creators can view messages in their conversations (needed for AI to respond)
DO $$ BEGIN
  CREATE POLICY "Creators can view their chat messages" ON chat_messages
    FOR SELECT USING (creator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 4. FIX: moderation_settings table (012_content_moderation.sql)
-- ===========================================
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can manage moderation settings" ON moderation_settings;

-- Admins can manage moderation settings
DO $$ BEGIN
  CREATE POLICY "Admins can manage moderation settings" ON moderation_settings
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 5. FIX: model_anchors table (012_content_moderation.sql)
-- ===========================================
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can manage anchors" ON model_anchors;

-- Admins can manage all anchors
DO $$ BEGIN
  CREATE POLICY "Admins can manage anchors" ON model_anchors
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Creators can manage their own model anchors
DO $$ BEGIN
  CREATE POLICY "Creators can manage own anchors" ON model_anchors
    FOR ALL USING (
      model_id IN (
        SELECT cm.id FROM creator_models cm
        JOIN creators c ON cm.creator_id = c.id
        WHERE c.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 6. FIX: content_moderation_scans table (012_content_moderation.sql)
-- ===========================================
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can manage scans" ON content_moderation_scans;

-- Admins can manage all scans
DO $$ BEGIN
  CREATE POLICY "Admins can manage scans" ON content_moderation_scans
    FOR ALL USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 7. FIX: moderation_jobs table (012_content_moderation.sql)
-- ===========================================
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can manage jobs" ON moderation_jobs;

-- Admins can view jobs
DO $$ BEGIN
  CREATE POLICY "Admins can view moderation jobs" ON moderation_jobs
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- VERIFICATION: List all policies with USING(true)
-- Run this manually to verify no dangerous policies remain:
-- SELECT schemaname, tablename, policyname, qual
-- FROM pg_policies
-- WHERE qual = 'true' OR qual LIKE '%USING (true)%';
-- ===========================================

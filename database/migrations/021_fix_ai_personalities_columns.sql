-- Migration: Add missing columns to ai_personalities table
-- These columns are used by the AI personality wizard but were missing

-- Step 1: Background fields
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS backstory TEXT;
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- Step 2: Chat behavior fields
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS turn_ons TEXT[] DEFAULT '{}';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS emoji_usage VARCHAR(20) DEFAULT 'moderate';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS response_length VARCHAR(20) DEFAULT 'medium';

-- Add comments
COMMENT ON COLUMN ai_personalities.backstory IS 'Character backstory and history';
COMMENT ON COLUMN ai_personalities.interests IS 'Array of interests and hobbies';
COMMENT ON COLUMN ai_personalities.turn_ons IS 'Topics and behaviors the persona enjoys';
COMMENT ON COLUMN ai_personalities.emoji_usage IS 'How often to use emojis: minimal, moderate, heavy';
COMMENT ON COLUMN ai_personalities.response_length IS 'Preferred response length: short, medium, long';

-- ===========================================
-- RLS POLICIES FOR ai_personalities
-- ===========================================

-- Enable RLS
ALTER TABLE ai_personalities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (safe to ignore errors)
DROP POLICY IF EXISTS "Creators can read own personalities" ON ai_personalities;
DROP POLICY IF EXISTS "Creators can create personalities" ON ai_personalities;
DROP POLICY IF EXISTS "Creators can update own personalities" ON ai_personalities;
DROP POLICY IF EXISTS "Service role full access" ON ai_personalities;
DROP POLICY IF EXISTS "Anyone can read active personalities for chat" ON ai_personalities;

-- Policy: Creators can read their own personalities
CREATE POLICY "Creators can read own personalities"
ON ai_personalities FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- Policy: Creators can create personalities
CREATE POLICY "Creators can create personalities"
ON ai_personalities FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

-- Policy: Creators can update their own personalities
CREATE POLICY "Creators can update own personalities"
ON ai_personalities FOR UPDATE
TO authenticated
USING (creator_id = auth.uid());

-- Policy: Anyone can read active personalities (for chat to work)
-- This allows the chat system to load personality for ANY creator/model
CREATE POLICY "Anyone can read active personalities for chat"
ON ai_personalities FOR SELECT
TO authenticated
USING (is_active = true);

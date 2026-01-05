-- ===========================================
-- LYRA AI PERSONALITY DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ===========================================

-- Create AI personalities table
CREATE TABLE IF NOT EXISTS ai_personalities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Identity & Appearance
  persona_name VARCHAR(50) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  height_cm INTEGER DEFAULT 165,
  body_type VARCHAR(20) DEFAULT 'slim',
  hair_color VARCHAR(30),
  hair_style VARCHAR(50),
  eye_color VARCHAR(20),
  skin_tone VARCHAR(20),
  style_vibes TEXT[] DEFAULT '{}',
  distinguishing_features TEXT,
  
  -- Personality Core
  personality_traits TEXT[] DEFAULT '{}',
  energy_level INTEGER DEFAULT 5 CHECK (energy_level >= 1 AND energy_level <= 10),
  humor_style VARCHAR(20) DEFAULT 'witty',
  intelligence_vibe VARCHAR(20) DEFAULT 'street_smart',
  mood VARCHAR(20) DEFAULT 'happy',
  
  -- Background & Interests
  backstory TEXT,
  occupation VARCHAR(50),
  interests TEXT[] DEFAULT '{}',
  music_taste TEXT[] DEFAULT '{}',
  guilty_pleasures TEXT,
  
  -- Romantic & Intimate Style
  flirting_style TEXT[] DEFAULT '{}',
  dynamic VARCHAR(20) DEFAULT 'switch',
  attracted_to TEXT[] DEFAULT '{}',
  love_language VARCHAR(20) DEFAULT 'words',
  pace INTEGER DEFAULT 5 CHECK (pace >= 1 AND pace <= 10),
  vibe_creates VARCHAR(30) DEFAULT 'playful_fun',
  turn_ons TEXT[] DEFAULT '{}',
  
  -- Voice & Speech
  vocabulary_level INTEGER DEFAULT 5 CHECK (vocabulary_level >= 1 AND vocabulary_level <= 10),
  emoji_usage VARCHAR(20) DEFAULT 'moderate',
  response_length VARCHAR(20) DEFAULT 'medium',
  speech_patterns TEXT[] DEFAULT '{}',
  accent_flavor VARCHAR(30) DEFAULT 'neutral',
  signature_phrases TEXT,
  
  -- Conversation Behavior
  topics_loves TEXT[] DEFAULT '{}',
  topics_avoids TEXT[] DEFAULT '{}',
  when_complimented VARCHAR(30) DEFAULT 'flirts_back',
  when_heated VARCHAR(30) DEFAULT 'leans_in',
  pet_peeves TEXT,
  
  -- Meta
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_personalities_creator_id ON ai_personalities(creator_id);

-- Enable RLS
ALTER TABLE ai_personalities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own AI personality"
  ON ai_personalities FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can insert own AI personality"
  ON ai_personalities FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own AI personality"
  ON ai_personalities FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own AI personality"
  ON ai_personalities FOR DELETE
  USING (auth.uid() = creator_id);

-- Public can view active AI personalities (for chat)
CREATE POLICY "Public can view active AI personalities"
  ON ai_personalities FOR SELECT
  USING (is_active = true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_personality_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER ai_personality_updated_at
  BEFORE UPDATE ON ai_personalities
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_personality_timestamp();

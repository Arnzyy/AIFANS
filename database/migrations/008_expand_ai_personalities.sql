-- Expand ai_personalities table with full wizard fields
-- Run this migration to support the new AI personality wizard

-- Add persona_name (rename from 'name' or add new column)
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS persona_name VARCHAR(100);
-- Copy existing name values to persona_name
UPDATE ai_personalities SET persona_name = name WHERE persona_name IS NULL;

-- Step 1: Identity & Appearance
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS height_cm INTEGER DEFAULT 165;
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS body_type VARCHAR(20) DEFAULT 'slim';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS hair_color VARCHAR(50) DEFAULT 'Brown';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS hair_style VARCHAR(50) DEFAULT 'Long & wavy';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS eye_color VARCHAR(30) DEFAULT 'Brown';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS skin_tone VARCHAR(20) DEFAULT 'olive';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS style_vibes TEXT[] DEFAULT '{}';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS distinguishing_features TEXT;

-- Step 2: Personality Core
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS energy_level INTEGER DEFAULT 5;
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS humor_style VARCHAR(20) DEFAULT 'witty';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS intelligence_vibe VARCHAR(20) DEFAULT 'street_smart';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS mood VARCHAR(20) DEFAULT 'happy';

-- Step 3: Background & Interests
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS occupation TEXT DEFAULT '';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS music_taste TEXT[] DEFAULT '{}';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS guilty_pleasures TEXT;

-- Step 4: Romantic & Intimate Style
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS flirting_style TEXT[] DEFAULT '{}';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS dynamic VARCHAR(20) DEFAULT 'switch';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS attracted_to TEXT[] DEFAULT '{}';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS love_language VARCHAR(20) DEFAULT 'words';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS pace INTEGER DEFAULT 5;
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS vibe_creates VARCHAR(30) DEFAULT 'playful_fun';

-- Step 5: Voice & Speech
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS vocabulary_level INTEGER DEFAULT 5;
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS speech_patterns TEXT[] DEFAULT '{}';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS accent_flavor VARCHAR(30) DEFAULT 'neutral';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS signature_phrases TEXT;

-- Step 6: Conversation Behavior
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS topics_loves TEXT[] DEFAULT '{}';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS topics_avoids TEXT[] DEFAULT '{}';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS when_complimented VARCHAR(30) DEFAULT 'flirts_back';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS when_heated VARCHAR(30) DEFAULT 'leans_in';
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS pet_peeves TEXT;

-- Add model_id to link personality to a specific model
ALTER TABLE ai_personalities ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES creator_models(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN ai_personalities.persona_name IS 'Display name for the AI persona';
COMMENT ON COLUMN ai_personalities.body_type IS 'Body type: petite, slim, athletic, curvy, tall';
COMMENT ON COLUMN ai_personalities.dynamic IS 'Relationship dynamic: submissive, switch, dominant';
COMMENT ON COLUMN ai_personalities.accent_flavor IS 'Speaking accent/flavor style';
COMMENT ON COLUMN ai_personalities.model_id IS 'Optional link to creator_models for avatar and content integration';

-- Create index for model lookup
CREATE INDEX IF NOT EXISTS idx_ai_personalities_model_id ON ai_personalities(model_id);

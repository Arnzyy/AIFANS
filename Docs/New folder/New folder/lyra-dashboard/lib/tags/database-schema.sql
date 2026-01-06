-- =============================================
-- LYRA — MODEL CATEGORIES & TAGGING SYSTEM
-- Database Schema for Supabase
-- =============================================

-- =====================
-- 1. TAGS TABLE
-- Controlled vocabulary for model discovery
-- =====================

DO $$ BEGIN
  CREATE TYPE tag_type AS ENUM ('PRIMARY', 'SECONDARY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  type tag_type NOT NULL DEFAULT 'SECONDARY',
  
  -- Display settings
  emoji VARCHAR(10),
  color VARCHAR(20),
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  
  -- Access control
  nsfw_allowed BOOLEAN DEFAULT true,      -- Can be used on NSFW models
  nsfw_only BOOLEAN DEFAULT false,        -- Only available for NSFW models
  active BOOLEAN DEFAULT true,
  
  -- Metadata
  usage_count INTEGER DEFAULT 0,          -- How many models use this tag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(active);
CREATE INDEX IF NOT EXISTS idx_tags_sort ON tags(type, sort_order);

-- =====================
-- 2. MODEL ↔ TAG RELATION
-- =====================

CREATE TABLE IF NOT EXISTS model_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL,  -- References creator_models(id)
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID,  -- References auth.users(id)
  
  UNIQUE(model_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_model_tags_model ON model_tags(model_id);
CREATE INDEX IF NOT EXISTS idx_model_tags_tag ON model_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_model_tags_primary ON model_tags(model_id, is_primary) WHERE is_primary = true;

-- =====================
-- 3. BLOCKED/DISALLOWED TERMS
-- Safety filter for tag names
-- =====================

DO $$ BEGIN
  CREATE TYPE blocked_term_severity AS ENUM ('BLOCK', 'WARN', 'FLAG');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS blocked_tag_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term VARCHAR(100) NOT NULL UNIQUE,
  reason VARCHAR(255),
  severity blocked_term_severity DEFAULT 'BLOCK',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 4. TAG AUDIT LOG
-- Track changes to tags
-- =====================

CREATE TABLE IF NOT EXISTS tag_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID REFERENCES tags(id),
  model_id UUID,  -- References creator_models(id)
  action VARCHAR(50) NOT NULL,
  actor_id UUID NOT NULL,
  actor_type VARCHAR(20) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tag_audit_tag ON tag_audit_log(tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_audit_model ON tag_audit_log(model_id);

-- =====================
-- 5. DEFAULT PRIMARY CATEGORIES (SEED DATA)
-- =====================

INSERT INTO tags (name, slug, type, emoji, sort_order, nsfw_allowed, description) VALUES
  ('Glamorous', 'glamorous', 'PRIMARY', '✨', 1, true, 'Elegant, sophisticated, high-fashion aesthetic'),
  ('Girl Next Door', 'girl-next-door', 'PRIMARY', '🌸', 2, true, 'Approachable, friendly, natural beauty'),
  ('Alternative', 'alternative', 'PRIMARY', '🖤', 3, true, 'Edgy, tattoos, piercings, alt fashion'),
  ('Sporty', 'sporty', 'PRIMARY', '💪', 4, true, 'Athletic, fitness-focused, active lifestyle'),
  ('Artistic', 'artistic', 'PRIMARY', '🎨', 5, true, 'Creative, bohemian, artsy aesthetic'),
  ('Professional', 'professional', 'PRIMARY', '💼', 6, true, 'Business, career-oriented persona'),
  ('Cozy', 'cozy', 'PRIMARY', '☕', 7, true, 'Homebody, warm, comfort-focused'),
  ('Bold', 'bold', 'PRIMARY', '🔥', 8, true, 'Confident, daring, attention-grabbing'),
  ('Mysterious', 'mysterious', 'PRIMARY', '🌙', 9, true, 'Enigmatic, dark aesthetic, intriguing'),
  ('Sweet', 'sweet', 'PRIMARY', '🍬', 10, true, 'Cute, kawaii-inspired, playful')
ON CONFLICT (slug) DO NOTHING;

-- =====================
-- 6. DEFAULT SECONDARY TAGS (SEED DATA)
-- =====================

-- Personality Tags
INSERT INTO tags (name, slug, type, emoji, nsfw_allowed, description) VALUES
  ('Playful', 'playful', 'SECONDARY', '😜', true, 'Fun-loving, teasing personality'),
  ('Intellectual', 'intellectual', 'SECONDARY', '📚', true, 'Smart, enjoys deep conversations'),
  ('Nurturing', 'nurturing', 'SECONDARY', '💕', true, 'Caring, supportive, warm'),
  ('Adventurous', 'adventurous', 'SECONDARY', '🌍', true, 'Loves travel and new experiences'),
  ('Witty', 'witty', 'SECONDARY', '😏', true, 'Sharp humor, clever banter'),
  ('Romantic', 'romantic', 'SECONDARY', '💝', true, 'Loves romance and connection'),
  ('Confident', 'confident', 'SECONDARY', '👑', true, 'Self-assured, empowered'),
  ('Shy', 'shy', 'SECONDARY', '🙈', true, 'Reserved, gradually opens up'),
  ('Dominant', 'dominant', 'SECONDARY', '⛓️', true, 'Takes charge, assertive'),
  ('Submissive', 'submissive', 'SECONDARY', '🎀', true, 'Yielding, eager to please')
ON CONFLICT (slug) DO NOTHING;

-- Style/Fashion Tags
INSERT INTO tags (name, slug, type, emoji, nsfw_allowed, description) VALUES
  ('Lingerie', 'lingerie', 'SECONDARY', '🩱', true, 'Loves lingerie and intimate wear'),
  ('Streetwear', 'streetwear', 'SECONDARY', '👟', true, 'Urban fashion, casual style'),
  ('Vintage', 'vintage', 'SECONDARY', '📻', true, 'Retro aesthetic, classic style'),
  ('Minimalist', 'minimalist', 'SECONDARY', '⬜', true, 'Clean, simple aesthetic'),
  ('Maximalist', 'maximalist', 'SECONDARY', '🌈', true, 'Bold colors, patterns, accessories'),
  ('Cosplay', 'cosplay', 'SECONDARY', '🎭', true, 'Costume play, character dress-up')
ON CONFLICT (slug) DO NOTHING;

-- Hair Tags
INSERT INTO tags (name, slug, type, emoji, nsfw_allowed, description) VALUES
  ('Blonde', 'blonde', 'SECONDARY', '👱', true, 'Blonde hair'),
  ('Brunette', 'brunette', 'SECONDARY', '👩', true, 'Brown hair'),
  ('Redhead', 'redhead', 'SECONDARY', '👩‍🦰', true, 'Red/ginger hair'),
  ('Dark Hair', 'dark-hair', 'SECONDARY', '🖤', true, 'Black or very dark hair'),
  ('Colorful Hair', 'colorful-hair', 'SECONDARY', '🌈', true, 'Dyed, rainbow, unnatural colors')
ON CONFLICT (slug) DO NOTHING;

-- Body Positivity Tags
INSERT INTO tags (name, slug, type, emoji, nsfw_allowed, description) VALUES
  ('Curvy', 'curvy', 'SECONDARY', '🍑', true, 'Curvy body type'),
  ('Petite', 'petite', 'SECONDARY', '🌷', true, 'Smaller frame'),
  ('Tall', 'tall', 'SECONDARY', '📏', true, 'Taller stature'),
  ('Fit', 'fit', 'SECONDARY', '💪', true, 'Athletic, toned')
ON CONFLICT (slug) DO NOTHING;

-- Interest Tags
INSERT INTO tags (name, slug, type, emoji, nsfw_allowed, description) VALUES
  ('Gamer', 'gamer', 'SECONDARY', '🎮', true, 'Gaming enthusiast'),
  ('Bookworm', 'bookworm', 'SECONDARY', '📖', true, 'Loves reading'),
  ('Foodie', 'foodie', 'SECONDARY', '🍕', true, 'Food and cooking lover'),
  ('Music Lover', 'music-lover', 'SECONDARY', '🎵', true, 'Passionate about music'),
  ('Nature Lover', 'nature-lover', 'SECONDARY', '🌿', true, 'Outdoor enthusiast'),
  ('Tech Savvy', 'tech-savvy', 'SECONDARY', '💻', true, 'Into technology'),
  ('Spiritual', 'spiritual', 'SECONDARY', '🧘', true, 'Spiritual or mindful')
ON CONFLICT (slug) DO NOTHING;

-- NSFW-Related Tags
INSERT INTO tags (name, slug, type, emoji, nsfw_allowed, nsfw_only, description) VALUES
  ('Explicit', 'explicit', 'SECONDARY', '🔞', true, true, 'Very explicit content'),
  ('Tease', 'tease', 'SECONDARY', '👀', true, false, 'Teasing, suggestive content'),
  ('Sensual', 'sensual', 'SECONDARY', '💋', true, false, 'Sensual, intimate vibes')
ON CONFLICT (slug) DO NOTHING;

-- Mark certain tags as NSFW-only
UPDATE tags SET nsfw_only = true WHERE slug IN ('explicit', 'dominant', 'submissive', 'lingerie');

-- =====================
-- 7. BLOCKED TERMS (SEED DATA)
-- =====================

INSERT INTO blocked_tag_terms (term, reason, severity) VALUES
  -- Minors/Youth
  ('teen', 'Implies minor', 'BLOCK'),
  ('teenager', 'Implies minor', 'BLOCK'),
  ('young', 'May imply minor', 'BLOCK'),
  ('underage', 'Implies minor', 'BLOCK'),
  ('child', 'Implies minor', 'BLOCK'),
  ('kid', 'Implies minor', 'BLOCK'),
  ('loli', 'Youth-coded', 'BLOCK'),
  ('jailbait', 'Implies minor', 'BLOCK'),
  ('schoolgirl', 'Youth-coded', 'BLOCK'),
  ('barely legal', 'Youth-coded', 'BLOCK'),
  
  -- Family/Incest
  ('mom', 'Family roleplay', 'BLOCK'),
  ('mother', 'Family roleplay', 'BLOCK'),
  ('mommy', 'Family roleplay', 'WARN'),
  ('dad', 'Family roleplay', 'BLOCK'),
  ('daddy', 'Family roleplay', 'WARN'),
  ('father', 'Family roleplay', 'BLOCK'),
  ('sister', 'Family roleplay', 'BLOCK'),
  ('brother', 'Family roleplay', 'BLOCK'),
  ('daughter', 'Family roleplay', 'BLOCK'),
  ('son', 'Family roleplay', 'BLOCK'),
  ('incest', 'Incest content', 'BLOCK'),
  ('family', 'May imply family roleplay', 'FLAG'),
  
  -- Ethnicity (as primary descriptor)
  ('asian', 'Ethnic fetishization risk', 'FLAG'),
  ('latina', 'Ethnic fetishization risk', 'FLAG'),
  ('ebony', 'Ethnic fetishization risk', 'FLAG'),
  ('black', 'Ethnic fetishization risk', 'FLAG'),
  ('white', 'Ethnic fetishization risk', 'FLAG'),
  ('indian', 'Ethnic fetishization risk', 'FLAG'),
  ('arab', 'Ethnic fetishization risk', 'FLAG'),
  
  -- Real persons
  ('celebrity', 'Real person risk', 'BLOCK'),
  ('famous', 'Real person risk', 'FLAG'),
  ('lookalike', 'Real person risk', 'BLOCK'),
  
  -- Illegal/Harmful
  ('rape', 'Illegal content', 'BLOCK'),
  ('forced', 'Non-consent', 'BLOCK'),
  ('non-con', 'Non-consent', 'BLOCK'),
  ('torture', 'Extreme content', 'BLOCK'),
  ('violence', 'Violent content', 'BLOCK'),
  ('blood', 'Gore content', 'BLOCK'),
  ('gore', 'Gore content', 'BLOCK'),
  ('animal', 'Bestiality risk', 'BLOCK'),
  ('beast', 'Bestiality risk', 'BLOCK')
ON CONFLICT (term) DO NOTHING;

-- =====================
-- 8. ROW LEVEL SECURITY
-- =====================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_tag_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_audit_log ENABLE ROW LEVEL SECURITY;

-- Tags are readable by all authenticated users
DROP POLICY IF EXISTS "Tags readable by authenticated" ON tags;
CREATE POLICY "Tags readable by authenticated"
  ON tags FOR SELECT
  TO authenticated
  USING (active = true);

-- Anyone can read model tags
DROP POLICY IF EXISTS "Model tags readable" ON model_tags;
CREATE POLICY "Model tags readable"
  ON model_tags FOR SELECT
  TO authenticated
  USING (true);

-- =====================
-- 9. HELPER FUNCTIONS
-- =====================

-- Update tag usage counts trigger
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tag_usage ON model_tags;
CREATE TRIGGER trigger_update_tag_usage
AFTER INSERT OR DELETE ON model_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- Check for blocked terms in text
CREATE OR REPLACE FUNCTION check_blocked_terms(p_text TEXT)
RETURNS TABLE(
  term VARCHAR,
  reason VARCHAR,
  severity VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bt.term,
    bt.reason,
    bt.severity::VARCHAR
  FROM blocked_tag_terms bt
  WHERE LOWER(p_text) LIKE '%' || LOWER(bt.term) || '%';
END;
$$ LANGUAGE plpgsql;

-- Validate model tags
CREATE OR REPLACE FUNCTION validate_model_tags(
  p_model_id UUID,
  p_primary_tag_id UUID,
  p_secondary_tag_ids UUID[],
  p_is_nsfw BOOLEAN
)
RETURNS TABLE(
  valid BOOLEAN,
  error_message VARCHAR
) AS $$
DECLARE
  v_primary_tag tags%ROWTYPE;
  v_secondary_count INTEGER;
  v_max_secondary INTEGER := 8;
BEGIN
  -- Check primary tag exists and is PRIMARY type
  SELECT * INTO v_primary_tag FROM tags WHERE id = p_primary_tag_id AND active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Primary tag not found'::VARCHAR;
    RETURN;
  END IF;
  
  IF v_primary_tag.type != 'PRIMARY' THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Selected tag is not a primary category'::VARCHAR;
    RETURN;
  END IF;
  
  -- Check NSFW compatibility
  IF v_primary_tag.nsfw_only AND NOT p_is_nsfw THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Primary tag requires NSFW mode'::VARCHAR;
    RETURN;
  END IF;
  
  -- Check secondary tag count
  v_secondary_count := COALESCE(array_length(p_secondary_tag_ids, 1), 0);
  
  IF v_secondary_count > v_max_secondary THEN
    RETURN QUERY SELECT false::BOOLEAN, ('Maximum ' || v_max_secondary || ' secondary tags allowed')::VARCHAR;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true::BOOLEAN, NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Set model tags (atomic operation)
CREATE OR REPLACE FUNCTION set_model_tags(
  p_model_id UUID,
  p_primary_tag_id UUID,
  p_secondary_tag_ids UUID[],
  p_actor_id UUID
)
RETURNS TABLE(success BOOLEAN, error_message VARCHAR) AS $$
DECLARE
  v_validation RECORD;
BEGIN
  -- Validate tags (assume is_nsfw from model, simplified here)
  SELECT * INTO v_validation FROM validate_model_tags(
    p_model_id, 
    p_primary_tag_id, 
    p_secondary_tag_ids, 
    true  -- Default to true, real implementation should check model
  );
  
  IF NOT v_validation.valid THEN
    RETURN QUERY SELECT false::BOOLEAN, v_validation.error_message;
    RETURN;
  END IF;
  
  -- Remove existing tags
  DELETE FROM model_tags WHERE model_id = p_model_id;
  
  -- Add primary tag
  INSERT INTO model_tags (model_id, tag_id, is_primary, added_by)
  VALUES (p_model_id, p_primary_tag_id, true, p_actor_id);
  
  -- Add secondary tags
  IF array_length(p_secondary_tag_ids, 1) > 0 THEN
    INSERT INTO model_tags (model_id, tag_id, is_primary, added_by)
    SELECT p_model_id, tid, false, p_actor_id
    FROM unnest(p_secondary_tag_ids) AS tid;
  END IF;
  
  -- Log the action
  INSERT INTO tag_audit_log (model_id, action, actor_id, actor_type, new_value)
  VALUES (
    p_model_id,
    'TAGS_SET',
    p_actor_id,
    'CREATOR',
    jsonb_build_object(
      'primary_tag_id', p_primary_tag_id,
      'secondary_tag_ids', p_secondary_tag_ids
    )
  );
  
  RETURN QUERY SELECT true::BOOLEAN, NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- 10. UPDATED_AT TRIGGER
-- =====================

CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tags_updated ON tags;
CREATE TRIGGER tags_updated
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_tags_updated_at();

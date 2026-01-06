// ===========================================
// LYRA — MODEL CATEGORIES & TAGGING SYSTEM
// Complete implementation for Claude Code
// ===========================================

// ===========================================
// SECTION 1: DATABASE SCHEMA (SQL)
// Run this in Supabase SQL Editor
// ===========================================

/*
-- =============================================
-- MODEL CATEGORIES & TAGGING SYSTEM - DATABASE
-- =============================================

-- =====================
-- 1. TAGS TABLE
-- Controlled vocabulary for model discovery
-- =====================

CREATE TYPE tag_type AS ENUM ('PRIMARY', 'SECONDARY');

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

CREATE INDEX idx_tags_type ON tags(type);
CREATE INDEX idx_tags_active ON tags(active);
CREATE INDEX idx_tags_sort ON tags(type, sort_order);

-- =====================
-- 2. MODEL ↔ TAG RELATION
-- =====================

CREATE TABLE IF NOT EXISTS model_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES creator_models(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),  -- Creator or Admin who added
  
  UNIQUE(model_id, tag_id)
);

CREATE INDEX idx_model_tags_model ON model_tags(model_id);
CREATE INDEX idx_model_tags_tag ON model_tags(tag_id);
CREATE INDEX idx_model_tags_primary ON model_tags(model_id, is_primary) WHERE is_primary = true;

-- =====================
-- 3. BLOCKED/DISALLOWED TERMS
-- Safety filter for tag names
-- =====================

CREATE TABLE IF NOT EXISTS blocked_tag_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term VARCHAR(100) NOT NULL UNIQUE,
  reason VARCHAR(255),
  severity ENUM('BLOCK', 'WARN', 'FLAG') DEFAULT 'BLOCK',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 4. TAG AUDIT LOG
-- Track changes to tags
-- =====================

CREATE TABLE IF NOT EXISTS tag_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID REFERENCES tags(id),
  model_id UUID REFERENCES creator_models(id),
  action VARCHAR(50) NOT NULL,  -- 'CREATED', 'UPDATED', 'DISABLED', 'ASSIGNED', 'REMOVED', 'REJECTED'
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_type VARCHAR(20) NOT NULL,  -- 'ADMIN', 'CREATOR', 'SYSTEM'
  old_value JSONB,
  new_value JSONB,
  reason VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tag_audit_tag ON tag_audit_log(tag_id);
CREATE INDEX idx_tag_audit_model ON tag_audit_log(model_id);

-- =====================
-- 5. DEFAULT TAGS (SEED DATA)
-- =====================

-- Primary Categories (Aesthetic/Style based)
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

-- Secondary Tags (Personality & Traits)
INSERT INTO tags (name, slug, type, emoji, nsfw_allowed, description) VALUES
  -- Personality
  ('Playful', 'playful', 'SECONDARY', '😜', true, 'Fun-loving, teasing personality'),
  ('Intellectual', 'intellectual', 'SECONDARY', '📚', true, 'Smart, enjoys deep conversations'),
  ('Nurturing', 'nurturing', 'SECONDARY', '💕', true, 'Caring, supportive, warm'),
  ('Adventurous', 'adventurous', 'SECONDARY', '🌍', true, 'Loves travel and new experiences'),
  ('Witty', 'witty', 'SECONDARY', '😏', true, 'Sharp humor, clever banter'),
  ('Romantic', 'romantic', 'SECONDARY', '💝', true, 'Loves romance and connection'),
  ('Confident', 'confident', 'SECONDARY', '👑', true, 'Self-assured, empowered'),
  ('Shy', 'shy', 'SECONDARY', '🙈', true, 'Reserved, gradually opens up'),
  ('Dominant', 'dominant', 'SECONDARY', '⛓️', true, 'Takes charge, assertive'),
  ('Submissive', 'submissive', 'SECONDARY', '🎀', true, 'Yielding, eager to please'),
  
  -- Style/Fashion
  ('Lingerie', 'lingerie', 'SECONDARY', '🩱', true, 'Loves lingerie and intimate wear'),
  ('Streetwear', 'streetwear', 'SECONDARY', '👟', true, 'Urban fashion, casual style'),
  ('Vintage', 'vintage', 'SECONDARY', '📻', true, 'Retro aesthetic, classic style'),
  ('Minimalist', 'minimalist', 'SECONDARY', '⬜', true, 'Clean, simple aesthetic'),
  ('Maximalist', 'maximalist', 'SECONDARY', '🌈', true, 'Bold colors, patterns, accessories'),
  ('Cosplay', 'cosplay', 'SECONDARY', '🎭', true, 'Costume play, character dress-up'),
  
  -- Hair
  ('Blonde', 'blonde', 'SECONDARY', '👱', true, 'Blonde hair'),
  ('Brunette', 'brunette', 'SECONDARY', '👩', true, 'Brown hair'),
  ('Redhead', 'redhead', 'SECONDARY', '👩‍🦰', true, 'Red/ginger hair'),
  ('Dark Hair', 'dark-hair', 'SECONDARY', '🖤', true, 'Black or very dark hair'),
  ('Colorful Hair', 'colorful-hair', 'SECONDARY', '🌈', true, 'Dyed, rainbow, unnatural colors'),
  
  -- Body Positivity (Non-specific)
  ('Curvy', 'curvy', 'SECONDARY', '🍑', true, 'Curvy body type'),
  ('Petite', 'petite', 'SECONDARY', '🌷', true, 'Smaller frame'),
  ('Tall', 'tall', 'SECONDARY', '📏', true, 'Taller stature'),
  ('Fit', 'fit', 'SECONDARY', '💪', true, 'Athletic, toned'),
  
  -- Interests
  ('Gamer', 'gamer', 'SECONDARY', '🎮', true, 'Gaming enthusiast'),
  ('Bookworm', 'bookworm', 'SECONDARY', '📖', true, 'Loves reading'),
  ('Foodie', 'foodie', 'SECONDARY', '🍕', true, 'Food and cooking lover'),
  ('Music Lover', 'music-lover', 'SECONDARY', '🎵', true, 'Passionate about music'),
  ('Nature Lover', 'nature-lover', 'SECONDARY', '🌿', true, 'Outdoor enthusiast'),
  ('Tech Savvy', 'tech-savvy', 'SECONDARY', '💻', true, 'Into technology'),
  ('Spiritual', 'spiritual', 'SECONDARY', '🧘', true, 'Spiritual or mindful'),
  
  -- NSFW-Only Tags
  ('Explicit', 'explicit', 'SECONDARY', '🔞', true, 'Very explicit content'),
  ('Tease', 'tease', 'SECONDARY', '👀', true, 'Teasing, suggestive content'),
  ('Sensual', 'sensual', 'SECONDARY', '💋', true, 'Sensual, intimate vibes')
ON CONFLICT (slug) DO NOTHING;

-- Mark NSFW-only tags
UPDATE tags SET nsfw_only = true WHERE slug IN ('explicit', 'dominant', 'submissive', 'lingerie');

-- =====================
-- 6. BLOCKED TERMS (SEED DATA)
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
-- 7. ROW LEVEL SECURITY
-- =====================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_tag_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_audit_log ENABLE ROW LEVEL SECURITY;

-- Tags are readable by all authenticated users
CREATE POLICY "Tags readable by authenticated"
  ON tags FOR SELECT
  TO authenticated
  USING (active = true);

-- Admins can manage tags
CREATE POLICY "Admins manage tags"
  ON tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Model tags readable if model is visible
CREATE POLICY "Model tags readable"
  ON model_tags FOR SELECT
  TO authenticated
  USING (true);

-- Creators can manage their own model tags
CREATE POLICY "Creators manage own model tags"
  ON model_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM creator_models m
      WHERE m.id = model_id
      AND m.creator_id = auth.uid()
    )
  );

-- Blocked terms only visible to admins
CREATE POLICY "Blocked terms admin only"
  ON blocked_tag_terms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- =====================
-- 8. HELPER FUNCTIONS
-- =====================

-- Get tags for a model
CREATE OR REPLACE FUNCTION get_model_tags(p_model_id UUID)
RETURNS TABLE(
  tag_id UUID,
  tag_name VARCHAR,
  tag_slug VARCHAR,
  tag_type tag_type,
  emoji VARCHAR,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.type,
    t.emoji,
    mt.is_primary
  FROM model_tags mt
  JOIN tags t ON t.id = mt.tag_id
  WHERE mt.model_id = p_model_id
  ORDER BY mt.is_primary DESC, t.sort_order;
END;
$$ LANGUAGE plpgsql;

-- Update tag usage counts
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tag_usage
AFTER INSERT OR DELETE ON model_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- Check for blocked terms
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
  v_invalid_tags TEXT[];
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
  
  -- Check secondary tags exist and are valid
  IF v_secondary_count > 0 THEN
    SELECT array_agg(t.name) INTO v_invalid_tags
    FROM unnest(p_secondary_tag_ids) AS tid
    LEFT JOIN tags t ON t.id = tid AND t.active = true
    WHERE t.id IS NULL OR (t.nsfw_only AND NOT p_is_nsfw);
    
    IF array_length(v_invalid_tags, 1) > 0 THEN
      RETURN QUERY SELECT false::BOOLEAN, ('Invalid tags: ' || array_to_string(v_invalid_tags, ', '))::VARCHAR;
      RETURN;
    END IF;
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
  v_model creator_models%ROWTYPE;
  v_validation RECORD;
BEGIN
  -- Get model
  SELECT * INTO v_model FROM creator_models WHERE id = p_model_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Model not found'::VARCHAR;
    RETURN;
  END IF;
  
  -- Validate tags
  SELECT * INTO v_validation FROM validate_model_tags(
    p_model_id, 
    p_primary_tag_id, 
    p_secondary_tag_ids, 
    v_model.is_nsfw
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
  
  -- Update model primary_tag_id
  UPDATE creator_models SET primary_tag_id = p_primary_tag_id WHERE id = p_model_id;
  
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
-- 9. UPDATE EXISTING TABLES
-- Add primary_tag_id to creator_models if needed
-- =====================

ALTER TABLE creator_models 
ADD COLUMN IF NOT EXISTS primary_tag_id UUID REFERENCES tags(id);

CREATE INDEX IF NOT EXISTS idx_models_primary_tag ON creator_models(primary_tag_id);

*/

// ===========================================
// SECTION 2: TYPESCRIPT TYPES
// ===========================================

export type TagType = 'PRIMARY' | 'SECONDARY';

export type BlockedTermSeverity = 'BLOCK' | 'WARN' | 'FLAG';

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: TagType;
  emoji?: string;
  color?: string;
  icon?: string;
  sort_order: number;
  nsfw_allowed: boolean;
  nsfw_only: boolean;
  active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ModelTag {
  id: string;
  model_id: string;
  tag_id: string;
  is_primary: boolean;
  added_at: string;
  added_by?: string;
  tag?: Tag; // Joined
}

export interface BlockedTerm {
  id: string;
  term: string;
  reason?: string;
  severity: BlockedTermSeverity;
  created_at: string;
}

export interface TagAuditLog {
  id: string;
  tag_id?: string;
  model_id?: string;
  action: string;
  actor_id: string;
  actor_type: 'ADMIN' | 'CREATOR' | 'SYSTEM';
  old_value?: any;
  new_value?: any;
  reason?: string;
  created_at: string;
}

export interface TagValidationResult {
  valid: boolean;
  error_message?: string;
  blocked_terms?: { term: string; reason: string; severity: string }[];
}

export interface TagSelection {
  primary_tag_id: string;
  secondary_tag_ids: string[];
}

// ===========================================
// SECTION 3: TAG SERVICE
// ===========================================

import { SupabaseClient } from '@supabase/supabase-js';

export class TagService {
  constructor(private supabase: SupabaseClient) {}

  // =====================
  // READ OPERATIONS
  // =====================

  /**
   * Get all active tags
   */
  async getAllTags(includeNsfwOnly: boolean = false): Promise<Tag[]> {
    let query = this.supabase
      .from('tags')
      .select('*')
      .eq('active', true)
      .order('type')
      .order('sort_order');

    if (!includeNsfwOnly) {
      query = query.eq('nsfw_only', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get primary categories only
   */
  async getPrimaryCategories(includeNsfwOnly: boolean = false): Promise<Tag[]> {
    let query = this.supabase
      .from('tags')
      .select('*')
      .eq('type', 'PRIMARY')
      .eq('active', true)
      .order('sort_order');

    if (!includeNsfwOnly) {
      query = query.eq('nsfw_only', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get secondary tags only
   */
  async getSecondaryTags(includeNsfwOnly: boolean = false): Promise<Tag[]> {
    let query = this.supabase
      .from('tags')
      .select('*')
      .eq('type', 'SECONDARY')
      .eq('active', true)
      .order('name');

    if (!includeNsfwOnly) {
      query = query.eq('nsfw_only', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get tags for a specific model
   */
  async getModelTags(modelId: string): Promise<ModelTag[]> {
    const { data, error } = await this.supabase
      .from('model_tags')
      .select(`
        *,
        tag:tags(*)
      `)
      .eq('model_id', modelId)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get popular tags by usage
   */
  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    const { data, error } = await this.supabase
      .from('tags')
      .select('*')
      .eq('active', true)
      .eq('type', 'SECONDARY')
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // =====================
  // VALIDATION
  // =====================

  /**
   * Check text for blocked terms
   */
  async checkBlockedTerms(text: string): Promise<BlockedTerm[]> {
    const { data, error } = await this.supabase.rpc('check_blocked_terms', {
      p_text: text,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Validate tag selection for a model
   */
  async validateTagSelection(
    modelId: string,
    primaryTagId: string,
    secondaryTagIds: string[],
    isNsfw: boolean
  ): Promise<TagValidationResult> {
    const { data, error } = await this.supabase.rpc('validate_model_tags', {
      p_model_id: modelId,
      p_primary_tag_id: primaryTagId,
      p_secondary_tag_ids: secondaryTagIds,
      p_is_nsfw: isNsfw,
    });

    if (error) {
      return { valid: false, error_message: error.message };
    }

    const result = data?.[0];
    return {
      valid: result?.valid || false,
      error_message: result?.error_message,
    };
  }

  // =====================
  // WRITE OPERATIONS
  // =====================

  /**
   * Set tags for a model (replaces existing)
   */
  async setModelTags(
    modelId: string,
    primaryTagId: string,
    secondaryTagIds: string[],
    actorId: string
  ): Promise<{ success: boolean; error_message?: string }> {
    const { data, error } = await this.supabase.rpc('set_model_tags', {
      p_model_id: modelId,
      p_primary_tag_id: primaryTagId,
      p_secondary_tag_ids: secondaryTagIds,
      p_actor_id: actorId,
    });

    if (error) {
      return { success: false, error_message: error.message };
    }

    const result = data?.[0];
    return {
      success: result?.success || false,
      error_message: result?.error_message,
    };
  }

  // =====================
  // ADMIN OPERATIONS
  // =====================

  /**
   * Create a new tag (admin only)
   */
  async createTag(tag: Partial<Tag>, actorId: string): Promise<Tag> {
    // Check for blocked terms in tag name
    const blockedTerms = await this.checkBlockedTerms(tag.name || '');
    if (blockedTerms.length > 0) {
      throw new Error(`Tag name contains blocked term: ${blockedTerms[0].term}`);
    }

    // Generate slug
    const slug = this.generateSlug(tag.name || '');

    const { data, error } = await this.supabase
      .from('tags')
      .insert({
        ...tag,
        slug,
      })
      .select()
      .single();

    if (error) throw error;

    // Log action
    await this.logTagAction(data.id, null, 'CREATED', actorId, 'ADMIN', null, data);

    return data;
  }

  /**
   * Update a tag (admin only)
   */
  async updateTag(tagId: string, updates: Partial<Tag>, actorId: string): Promise<Tag> {
    // Get old value
    const { data: oldTag } = await this.supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single();

    // Check for blocked terms if name changed
    if (updates.name) {
      const blockedTerms = await this.checkBlockedTerms(updates.name);
      if (blockedTerms.length > 0) {
        throw new Error(`Tag name contains blocked term: ${blockedTerms[0].term}`);
      }
      updates.slug = this.generateSlug(updates.name);
    }

    const { data, error } = await this.supabase
      .from('tags')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tagId)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await this.logTagAction(tagId, null, 'UPDATED', actorId, 'ADMIN', oldTag, data);

    return data;
  }

  /**
   * Disable a tag (admin only)
   */
  async disableTag(tagId: string, actorId: string, reason?: string): Promise<void> {
    await this.supabase
      .from('tags')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', tagId);

    await this.logTagAction(tagId, null, 'DISABLED', actorId, 'ADMIN', null, null, reason);
  }

  /**
   * Add blocked term (admin only)
   */
  async addBlockedTerm(
    term: string,
    reason: string,
    severity: BlockedTermSeverity
  ): Promise<BlockedTerm> {
    const { data, error } = await this.supabase
      .from('blocked_tag_terms')
      .insert({ term: term.toLowerCase(), reason, severity })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all blocked terms (admin only)
   */
  async getBlockedTerms(): Promise<BlockedTerm[]> {
    const { data, error } = await this.supabase
      .from('blocked_tag_terms')
      .select('*')
      .order('term');

    if (error) throw error;
    return data || [];
  }

  /**
   * Override model tags during approval (admin only)
   */
  async adminOverrideModelTags(
    modelId: string,
    primaryTagId: string,
    secondaryTagIds: string[],
    actorId: string,
    reason: string
  ): Promise<{ success: boolean; error_message?: string }> {
    const result = await this.setModelTags(modelId, primaryTagId, secondaryTagIds, actorId);

    if (result.success) {
      await this.logTagAction(null, modelId, 'ADMIN_OVERRIDE', actorId, 'ADMIN', null, {
        primary_tag_id: primaryTagId,
        secondary_tag_ids: secondaryTagIds,
      }, reason);
    }

    return result;
  }

  // =====================
  // DISCOVERY QUERIES
  // =====================

  /**
   * Get models by primary category
   */
  async getModelsByCategory(
    categorySlug: string,
    options: {
      limit?: number;
      offset?: number;
      includeNsfw?: boolean;
    } = {}
  ): Promise<any[]> {
    const { limit = 20, offset = 0, includeNsfw = false } = options;

    let query = this.supabase
      .from('creator_models')
      .select(`
        *,
        primary_tag:tags!primary_tag_id(*),
        model_tags(tag:tags(*))
      `)
      .eq('status', 'APPROVED')
      .eq('primary_tag.slug', categorySlug)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeNsfw) {
      query = query.eq('is_nsfw', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get models by secondary tag
   */
  async getModelsByTag(
    tagSlug: string,
    options: {
      limit?: number;
      offset?: number;
      includeNsfw?: boolean;
    } = {}
  ): Promise<any[]> {
    const { limit = 20, offset = 0, includeNsfw = false } = options;

    // First get the tag ID
    const { data: tag } = await this.supabase
      .from('tags')
      .select('id')
      .eq('slug', tagSlug)
      .single();

    if (!tag) return [];

    let query = this.supabase
      .from('model_tags')
      .select(`
        model:creator_models!inner(
          *,
          primary_tag:tags!primary_tag_id(*),
          model_tags(tag:tags(*))
        )
      `)
      .eq('tag_id', tag.id)
      .eq('model.status', 'APPROVED')
      .order('model.created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeNsfw) {
      query = query.eq('model.is_nsfw', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((d: any) => d.model);
  }

  /**
   * Search models by tags
   */
  async searchModelsByTags(
    tagIds: string[],
    options: {
      limit?: number;
      offset?: number;
      includeNsfw?: boolean;
      matchAll?: boolean;
    } = {}
  ): Promise<any[]> {
    const { limit = 20, offset = 0, includeNsfw = false, matchAll = false } = options;

    // For matchAll, we need models that have ALL specified tags
    // For matchAny, we need models that have ANY of the specified tags

    if (matchAll) {
      // Use a more complex query with COUNT
      const { data, error } = await this.supabase.rpc('search_models_by_all_tags', {
        p_tag_ids: tagIds,
        p_include_nsfw: includeNsfw,
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw error;
      return data || [];
    } else {
      const { data, error } = await this.supabase
        .from('model_tags')
        .select(`
          model:creator_models!inner(
            *,
            primary_tag:tags!primary_tag_id(*)
          )
        `)
        .in('tag_id', tagIds)
        .eq('model.status', 'APPROVED')
        .order('model.created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Deduplicate models
      const modelMap = new Map();
      (data || []).forEach((d: any) => {
        if (!includeNsfw && d.model.is_nsfw) return;
        if (!modelMap.has(d.model.id)) {
          modelMap.set(d.model.id, d.model);
        }
      });

      return Array.from(modelMap.values());
    }
  }

  // =====================
  // HELPERS
  // =====================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async logTagAction(
    tagId: string | null,
    modelId: string | null,
    action: string,
    actorId: string,
    actorType: 'ADMIN' | 'CREATOR' | 'SYSTEM',
    oldValue?: any,
    newValue?: any,
    reason?: string
  ): Promise<void> {
    await this.supabase.from('tag_audit_log').insert({
      tag_id: tagId,
      model_id: modelId,
      action,
      actor_id: actorId,
      actor_type: actorType,
      old_value: oldValue,
      new_value: newValue,
      reason,
    });
  }
}

// ===========================================
// SECTION 4: API ROUTES
// ===========================================

// --- /api/tags/route.ts ---
/*
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TagService } from '@/lib/tags/tag-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const tagService = new TagService(supabase);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'primary' | 'secondary' | 'all'
    const includeNsfw = searchParams.get('nsfw') === 'true';

    let tags;
    if (type === 'primary') {
      tags = await tagService.getPrimaryCategories(includeNsfw);
    } else if (type === 'secondary') {
      tags = await tagService.getSecondaryTags(includeNsfw);
    } else {
      tags = await tagService.getAllTags(includeNsfw);
    }

    return NextResponse.json({ tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
*/

// --- /api/tags/validate/route.ts ---
/*
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TagService } from '@/lib/tags/tag-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const tagService = new TagService(supabase);

    const { text } = await request.json();
    const blockedTerms = await tagService.checkBlockedTerms(text);

    return NextResponse.json({
      valid: blockedTerms.length === 0,
      blocked_terms: blockedTerms,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
*/

// --- /api/models/[modelId]/tags/route.ts ---
/*
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TagService } from '@/lib/tags/tag-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const tagService = new TagService(supabase);

    const tags = await tagService.getModelTags(params.modelId);
    return NextResponse.json({ tags });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const tagService = new TagService(supabase);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { primary_tag_id, secondary_tag_ids } = await request.json();

    const result = await tagService.setModelTags(
      params.modelId,
      primary_tag_id,
      secondary_tag_ids || [],
      user.id
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error_message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
*/

// ===========================================
// SECTION 5: REACT COMPONENTS
// ===========================================

// Note: These would be in separate files in production

export const TagSelectorComponent = `
'use client';

import { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, Sparkles } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  slug: string;
  type: 'PRIMARY' | 'SECONDARY';
  emoji?: string;
  nsfw_only: boolean;
  usage_count: number;
}

interface TagSelectorProps {
  isNsfw: boolean;
  initialPrimaryTagId?: string;
  initialSecondaryTagIds?: string[];
  maxSecondaryTags?: number;
  onChange: (selection: { primaryTagId: string | null; secondaryTagIds: string[] }) => void;
  disabled?: boolean;
}

export function TagSelector({
  isNsfw,
  initialPrimaryTagId,
  initialSecondaryTagIds = [],
  maxSecondaryTags = 8,
  onChange,
  disabled = false,
}: TagSelectorProps) {
  const [primaryCategories, setPrimaryCategories] = useState<Tag[]>([]);
  const [secondaryTags, setSecondaryTags] = useState<Tag[]>([]);
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(initialPrimaryTagId || null);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>(initialSecondaryTagIds);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTags();
  }, [isNsfw]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const [primaryRes, secondaryRes] = await Promise.all([
        fetch(\`/api/tags?type=primary&nsfw=\${isNsfw}\`),
        fetch(\`/api/tags?type=secondary&nsfw=\${isNsfw}\`),
      ]);
      
      const primaryData = await primaryRes.json();
      const secondaryData = await secondaryRes.json();
      
      setPrimaryCategories(primaryData.tags || []);
      setSecondaryTags(secondaryData.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrimarySelect = (tagId: string) => {
    if (disabled) return;
    setSelectedPrimary(tagId);
    onChange({ primaryTagId: tagId, secondaryTagIds: selectedSecondary });
  };

  const handleSecondaryToggle = (tagId: string) => {
    if (disabled) return;
    
    let newSelection: string[];
    if (selectedSecondary.includes(tagId)) {
      newSelection = selectedSecondary.filter((id) => id !== tagId);
    } else {
      if (selectedSecondary.length >= maxSecondaryTags) {
        return; // Max reached
      }
      newSelection = [...selectedSecondary, tagId];
    }
    
    setSelectedSecondary(newSelection);
    onChange({ primaryTagId: selectedPrimary, secondaryTagIds: newSelection });
  };

  const filteredSecondaryTags = secondaryTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-zinc-800 rounded-xl" />
        <div className="h-40 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Category Selection */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Primary Category <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-3">
          Choose the main category that best describes your model
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {primaryCategories.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handlePrimarySelect(tag.id)}
              disabled={disabled || (tag.nsfw_only && !isNsfw)}
              className={\`p-3 rounded-xl border-2 transition-all text-left \${
                selectedPrimary === tag.id
                  ? 'border-purple-500 bg-purple-500/20'
                  : tag.nsfw_only && !isNsfw
                  ? 'border-white/5 bg-zinc-800/50 opacity-50 cursor-not-allowed'
                  : 'border-white/10 bg-zinc-800 hover:border-white/20'
              }\`}
            >
              <div className="flex items-center gap-2">
                {tag.emoji && <span className="text-xl">{tag.emoji}</span>}
                <span className="font-medium text-sm">{tag.name}</span>
              </div>
              {tag.nsfw_only && (
                <span className="text-[10px] text-pink-400 mt-1 block">NSFW only</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Tags Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium">
            Additional Tags
          </label>
          <span className={\`text-xs \${
            selectedSecondary.length >= maxSecondaryTags ? 'text-yellow-400' : 'text-gray-400'
          }\`}>
            {selectedSecondary.length} / {maxSecondaryTags} selected
          </span>
        </div>
        
        <p className="text-xs text-gray-400 mb-3">
          Add tags to help users discover your model
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg mb-3 focus:outline-none focus:border-purple-500"
        />

        {/* Selected Tags */}
        {selectedSecondary.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 p-3 bg-zinc-800/50 rounded-lg">
            {selectedSecondary.map((tagId) => {
              const tag = secondaryTags.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <button
                  key={tag.id}
                  onClick={() => handleSecondaryToggle(tag.id)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm hover:bg-purple-500/30 transition"
                >
                  {tag.emoji && <span>{tag.emoji}</span>}
                  <span>{tag.name}</span>
                  <X className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        )}

        {/* Available Tags */}
        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 bg-zinc-900 rounded-lg border border-white/10">
          {filteredSecondaryTags.map((tag) => {
            const isSelected = selectedSecondary.includes(tag.id);
            const isDisabled = disabled || (!isSelected && selectedSecondary.length >= maxSecondaryTags) || (tag.nsfw_only && !isNsfw);
            
            return (
              <button
                key={tag.id}
                onClick={() => handleSecondaryToggle(tag.id)}
                disabled={isDisabled}
                className={\`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition \${
                  isSelected
                    ? 'bg-purple-500 text-white'
                    : isDisabled
                    ? 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                    : 'bg-zinc-800 hover:bg-zinc-700'
                }\`}
              >
                {tag.emoji && <span>{tag.emoji}</span>}
                <span>{tag.name}</span>
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
`;

export const AdminTagManagerComponent = `
'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  GripVertical,
} from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: 'PRIMARY' | 'SECONDARY';
  emoji?: string;
  sort_order: number;
  nsfw_allowed: boolean;
  nsfw_only: boolean;
  active: boolean;
  usage_count: number;
}

export function AdminTagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'PRIMARY' | 'SECONDARY'>('all');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTag = async (tag: Partial<Tag>) => {
    try {
      const method = tag.id ? 'PUT' : 'POST';
      const url = tag.id ? \`/api/admin/tags/\${tag.id}\` : '/api/admin/tags';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tag),
      });
      
      fetchTags();
      setEditingTag(null);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to save tag:', error);
    }
  };

  const handleToggleActive = async (tag: Tag) => {
    await handleSaveTag({ ...tag, active: !tag.active });
  };

  const filteredTags = tags.filter((tag) => {
    if (filter !== 'all' && tag.type !== filter) return false;
    if (!showInactive && !tag.active) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tag Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Tag
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl">
        <div className="flex gap-2">
          {(['all', 'PRIMARY', 'SECONDARY'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={\`px-3 py-1 rounded-lg text-sm \${
                filter === f
                  ? 'bg-purple-500'
                  : 'bg-zinc-800 hover:bg-zinc-700'
              }\`}
            >
              {f === 'all' ? 'All' : f === 'PRIMARY' ? 'Primary' : 'Secondary'}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={\`flex items-center gap-2 px-3 py-1 rounded-lg text-sm \${
            showInactive ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-800'
          }\`}
        >
          {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showInactive ? 'Showing Inactive' : 'Show Inactive'}
        </button>
      </div>

      {/* Tags Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Tag</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium">NSFW</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Usage</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredTags.map((tag) => (
              <tr key={tag.id} className={\`\${!tag.active ? 'opacity-50' : ''}\`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {tag.emoji && <span className="text-xl">{tag.emoji}</span>}
                    <div>
                      <p className="font-medium">{tag.name}</p>
                      <p className="text-xs text-gray-500">{tag.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={\`px-2 py-1 rounded text-xs \${
                    tag.type === 'PRIMARY' 
                      ? 'bg-purple-500/20 text-purple-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }\`}>
                    {tag.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {tag.nsfw_only ? (
                    <span className="text-pink-400 text-sm">NSFW Only</span>
                  ) : tag.nsfw_allowed ? (
                    <span className="text-green-400 text-sm">Allowed</span>
                  ) : (
                    <span className="text-gray-400 text-sm">SFW Only</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">{tag.usage_count}</td>
                <td className="px-4 py-3">
                  <span className={\`px-2 py-1 rounded text-xs \${
                    tag.active 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }\`}>
                    {tag.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingTag(tag)}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(tag)}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                      {tag.active ? (
                        <EyeOff className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-green-400" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal would go here */}
    </div>
  );
}
`;

export const DiscoveryPageComponent = `
'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Filter, Search, X } from 'lucide-react';
import Link from 'next/link';

interface Tag {
  id: string;
  name: string;
  slug: string;
  emoji?: string;
  usage_count: number;
}

interface Model {
  id: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  primary_tag: Tag;
  is_nsfw: boolean;
}

export function DiscoveryPage() {
  const [primaryCategories, setPrimaryCategories] = useState<Tag[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showNsfw, setShowNsfw] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, [showNsfw]);

  useEffect(() => {
    fetchModels();
  }, [selectedCategory, selectedTags, showNsfw]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, popularRes] = await Promise.all([
        fetch(\`/api/tags?type=primary&nsfw=\${showNsfw}\`),
        fetch('/api/tags/popular?limit=12'),
      ]);
      
      const categoriesData = await categoriesRes.json();
      const popularData = await popularRes.json();
      
      setPrimaryCategories(categoriesData.tags || []);
      setPopularTags(popularData.tags || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      let url = '/api/models/discover?';
      if (selectedCategory) url += \`category=\${selectedCategory}&\`;
      if (selectedTags.length) url += \`tags=\${selectedTags.join(',')}&\`;
      url += \`nsfw=\${showNsfw}\`;
      
      const response = await fetch(url);
      const data = await response.json();
      setModels(data.models || []);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTags([]);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-purple-900/20 to-transparent py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Discover AI Companions</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Find the perfect AI persona to chat with. Browse by category or filter by personality traits.
          </p>
        </div>
      </div>

      {/* NSFW Toggle */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowNsfw(!showNsfw)}
            className={\`px-4 py-2 rounded-lg text-sm font-medium transition \${
              showNsfw
                ? 'bg-pink-500 text-white'
                : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }\`}
          >
            {showNsfw ? '🔞 NSFW Enabled' : 'Show NSFW'}
          </button>
        </div>
      </div>

      {/* Category Cards */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <h2 className="text-xl font-bold mb-4">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {primaryCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(
                selectedCategory === category.slug ? null : category.slug
              )}
              className={\`p-4 rounded-xl border-2 transition-all text-left \${
                selectedCategory === category.slug
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-white/10 bg-zinc-900 hover:border-white/20'
              }\`}
            >
              <div className="text-2xl mb-1">{category.emoji}</div>
              <div className="font-medium">{category.name}</div>
              <div className="text-xs text-gray-500">{category.usage_count} models</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tag Filters */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Filter by Tags</h2>
          {(selectedCategory || selectedTags.length > 0) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={\`px-3 py-1.5 rounded-full text-sm transition \${
                selectedTags.includes(tag.id)
                  ? 'bg-purple-500 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700'
              }\`}
            >
              {tag.emoji && <span className="mr-1">{tag.emoji}</span>}
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <h2 className="text-xl font-bold mb-4">
          {selectedCategory || selectedTags.length > 0 ? 'Filtered Results' : 'Featured Models'}
          <span className="text-gray-500 font-normal ml-2">({models.length})</span>
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {models.map((model) => (
            <Link
              key={model.id}
              href={\`/model/\${model.id}\`}
              className="bg-zinc-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition group"
            >
              <div className="aspect-square bg-zinc-800 relative">
                {model.avatar_url && (
                  <img
                    src={model.avatar_url}
                    alt={model.display_name}
                    className="w-full h-full object-cover"
                  />
                )}
                {model.is_nsfw && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-pink-500 rounded text-xs font-bold">
                    18+
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold mb-1 group-hover:text-purple-400 transition">
                  {model.display_name}
                </h3>
                <p className="text-sm text-gray-400 line-clamp-2">{model.bio}</p>
                {model.primary_tag && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded text-xs">
                      {model.primary_tag.emoji} {model.primary_tag.name}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

// ===========================================
// SECTION 6: EXPORTS & INDEX
// ===========================================

export const tagSystemExports = {
  // Types
  Tag: {} as Tag,
  ModelTag: {} as ModelTag,
  BlockedTerm: {} as BlockedTerm,
  TagAuditLog: {} as TagAuditLog,
  TagValidationResult: {} as TagValidationResult,
  TagSelection: {} as TagSelection,
  
  // Service
  TagService,
  
  // Components (as strings for file creation)
  components: {
    TagSelector: TagSelectorComponent,
    AdminTagManager: AdminTagManagerComponent,
    DiscoveryPage: DiscoveryPageComponent,
  },
};

export default tagSystemExports;

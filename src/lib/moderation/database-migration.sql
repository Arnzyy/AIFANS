-- ===========================================
-- MODERATION SYSTEM - DATABASE MIGRATION
-- Run this in Supabase SQL editor
-- ===========================================

-- 1. Add moderation_status column to content_items
-- Content must be approved before being visible to public
ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending_scan'
CHECK (moderation_status IN ('pending_scan', 'scanning', 'approved', 'pending_review', 'rejected'));

ALTER TABLE content_items
ADD COLUMN IF NOT EXISTS moderation_scan_id UUID REFERENCES content_moderation_scans(id);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_items_moderation_status
ON content_items(moderation_status);

-- 3. Create content_moderation_scans table if not exists
CREATE TABLE IF NOT EXISTS content_moderation_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('model_profile', 'model_gallery', 'model_cover', 'ppv_content', 'chat_media', 'onboarding')),
  target_id UUID NOT NULL,
  model_id UUID REFERENCES creator_models(id),
  creator_id UUID NOT NULL REFERENCES creators(id),
  r2_key TEXT NOT NULL,
  r2_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_scan' CHECK (status IN ('pending_scan', 'scanning', 'approved', 'pending_review', 'rejected', 'failed')),

  -- Scores (0-100)
  face_consistency_score INTEGER,
  celebrity_risk_score INTEGER,
  real_person_risk_score INTEGER,
  deepfake_risk_score INTEGER,
  minor_risk_score INTEGER,

  -- Results
  flags TEXT[] DEFAULT '{}',
  staff_summary TEXT,
  scan_confidence INTEGER,

  -- Scan metadata
  scanned_at TIMESTAMPTZ,
  scan_duration_ms INTEGER,
  scan_model TEXT,
  raw_response JSONB,

  -- Review info
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  review_action TEXT CHECK (review_action IN ('approved', 'rejected', 'escalated')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create model_anchors table for face consistency checking
CREATE TABLE IF NOT EXISTS model_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES creator_models(id),
  r2_key TEXT NOT NULL,
  r2_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  note TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_model_anchors_model_id
ON model_anchors(model_id) WHERE is_active = true;

-- 5. Create moderation_jobs queue
CREATE TABLE IF NOT EXISTS moderation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('model_onboarding', 'content_upload', 'bulk_rescan')),
  target_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  worker_id TEXT,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_jobs_queue
ON moderation_jobs(priority, created_at) WHERE status = 'queued';

-- 6. Create moderation_audit_log
CREATE TABLE IF NOT EXISTS moderation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES content_moderation_scans(id),
  model_id UUID REFERENCES creator_models(id),
  creator_id UUID REFERENCES creators(id),
  actor_id UUID REFERENCES profiles(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'admin', 'moderator')),
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_audit_log_scan_id
ON moderation_audit_log(scan_id);

-- 7. Create moderation_settings table
CREATE TABLE IF NOT EXISTS moderation_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',

  -- Auto-approve thresholds (lower than these = auto approve)
  auto_approve_max_celebrity_risk INTEGER DEFAULT 30,
  auto_approve_min_face_consistency INTEGER DEFAULT 70,
  auto_approve_max_deepfake_risk INTEGER DEFAULT 30,
  auto_approve_max_real_person_risk INTEGER DEFAULT 40,

  -- Auto-reject thresholds (higher than these = auto reject)
  auto_reject_min_minor_risk INTEGER DEFAULT 70,

  -- Review thresholds (between auto-approve and these = pending review)
  review_min_celebrity_risk INTEGER DEFAULT 50,
  review_min_face_consistency_drop INTEGER DEFAULT 50,
  review_min_deepfake_risk INTEGER DEFAULT 50,

  -- Feature flags
  enabled BOOLEAN DEFAULT true,
  scan_on_upload BOOLEAN DEFAULT true,
  scan_on_onboarding BOOLEAN DEFAULT true,
  require_anchors_for_consistency BOOLEAN DEFAULT true,

  -- Limits
  max_anchors_per_model INTEGER DEFAULT 10,
  min_anchors_for_consistency INTEGER DEFAULT 3,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Insert default settings
INSERT INTO moderation_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 8. Set existing approved content (optional - run only if you want existing content to be visible)
-- UPDATE content_items SET moderation_status = 'approved' WHERE moderation_status IS NULL;

-- 9. RLS Policies for content_moderation_scans
ALTER TABLE content_moderation_scans ENABLE ROW LEVEL SECURITY;

-- Creators can see their own scans (limited info)
CREATE POLICY "creators_own_scans" ON content_moderation_scans
FOR SELECT USING (
  creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
);

-- Admins can see all scans
CREATE POLICY "admins_full_access" ON content_moderation_scans
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

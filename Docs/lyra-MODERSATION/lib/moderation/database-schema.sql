-- LYRA Virtual Moderation Staff Member
-- Database Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLE: model_anchors
-- Stores approved baseline reference images for face consistency checking
-- ============================================
CREATE TABLE IF NOT EXISTS model_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES creator_models(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  r2_url TEXT, -- Public or signed URL for quick access
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  note TEXT,
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT model_anchors_model_id_r2_key_unique UNIQUE (model_id, r2_key)
);

-- Index for fast lookup by model
CREATE INDEX idx_model_anchors_model_id ON model_anchors(model_id) WHERE is_active = true;

-- ============================================
-- TABLE: content_moderation_scans
-- Stores scan results for all uploaded content
-- ============================================
CREATE TABLE IF NOT EXISTS content_moderation_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What we're scanning
  target_type TEXT NOT NULL CHECK (target_type IN ('model_profile', 'model_gallery', 'model_cover', 'ppv_content', 'chat_media', 'onboarding')),
  target_id UUID NOT NULL, -- ID of the content/model being scanned
  model_id UUID REFERENCES creator_models(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  
  -- File reference
  r2_key TEXT NOT NULL,
  r2_url TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending_scan' CHECK (status IN ('pending_scan', 'scanning', 'approved', 'pending_review', 'rejected', 'failed')),
  
  -- Moderation Scores (0-100)
  face_consistency_score INT CHECK (face_consistency_score >= 0 AND face_consistency_score <= 100),
  celebrity_risk_score INT CHECK (celebrity_risk_score >= 0 AND celebrity_risk_score <= 100),
  real_person_risk_score INT CHECK (real_person_risk_score >= 0 AND real_person_risk_score <= 100),
  deepfake_risk_score INT CHECK (deepfake_risk_score >= 0 AND deepfake_risk_score <= 100),
  minor_risk_score INT CHECK (minor_risk_score >= 0 AND minor_risk_score <= 100),
  
  -- Flags and summary
  flags JSONB DEFAULT '[]'::jsonb,
  staff_summary TEXT,
  scan_confidence INT CHECK (scan_confidence >= 0 AND scan_confidence <= 100),
  
  -- Scan metadata
  scanned_at TIMESTAMPTZ,
  scan_duration_ms INT,
  scan_model TEXT, -- Which AI model was used (claude-3-5-sonnet, gpt-4o, etc.)
  raw_response JSONB, -- Store full response for debugging
  
  -- Review info
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  review_action TEXT CHECK (review_action IN ('approved', 'rejected', 'escalated')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_moderation_scans_status ON content_moderation_scans(status);
CREATE INDEX idx_content_moderation_scans_model_id ON content_moderation_scans(model_id);
CREATE INDEX idx_content_moderation_scans_creator_id ON content_moderation_scans(creator_id);
CREATE INDEX idx_content_moderation_scans_pending ON content_moderation_scans(status, created_at) 
  WHERE status IN ('pending_scan', 'pending_review');

-- ============================================
-- TABLE: moderation_jobs
-- Queue for async processing
-- ============================================
CREATE TABLE IF NOT EXISTS moderation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Job target
  target_type TEXT NOT NULL CHECK (target_type IN ('model_onboarding', 'content_upload', 'bulk_rescan')),
  target_id UUID NOT NULL, -- scan_id from content_moderation_scans
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  priority INT DEFAULT 5, -- 1 = highest, 10 = lowest
  
  -- Execution tracking
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Processing metadata
  worker_id TEXT, -- Which worker picked this up
  started_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job queue
CREATE INDEX idx_moderation_jobs_queue ON moderation_jobs(status, priority, created_at) 
  WHERE status = 'queued';
CREATE INDEX idx_moderation_jobs_processing ON moderation_jobs(status, started_at) 
  WHERE status = 'processing';

-- ============================================
-- TABLE: moderation_audit_log
-- Immutable audit trail for all moderation actions
-- ============================================
CREATE TABLE IF NOT EXISTS moderation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was affected
  scan_id UUID REFERENCES content_moderation_scans(id),
  model_id UUID REFERENCES creator_models(id),
  creator_id UUID REFERENCES creators(id),
  
  -- Who did it
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'admin', 'moderator')),
  
  -- What happened
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  details JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_moderation_audit_log_scan_id ON moderation_audit_log(scan_id);
CREATE INDEX idx_moderation_audit_log_created_at ON moderation_audit_log(created_at DESC);

-- ============================================
-- TABLE: moderation_settings
-- Platform-wide moderation thresholds
-- ============================================
CREATE TABLE IF NOT EXISTS moderation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Thresholds for auto-actions
  auto_approve_max_celebrity_risk INT DEFAULT 30,
  auto_approve_min_face_consistency INT DEFAULT 70,
  auto_approve_max_deepfake_risk INT DEFAULT 30,
  auto_approve_max_real_person_risk INT DEFAULT 40,
  
  -- Thresholds for auto-reject
  auto_reject_min_minor_risk INT DEFAULT 70,
  
  -- Thresholds for pending review
  review_min_celebrity_risk INT DEFAULT 50,
  review_min_face_consistency_drop INT DEFAULT 50,
  review_min_deepfake_risk INT DEFAULT 50,
  
  -- Feature flags
  enabled BOOLEAN DEFAULT true,
  scan_on_upload BOOLEAN DEFAULT true,
  scan_on_onboarding BOOLEAN DEFAULT true,
  require_anchors_for_consistency BOOLEAN DEFAULT true,
  
  -- Limits
  max_anchors_per_model INT DEFAULT 10,
  min_anchors_for_consistency INT DEFAULT 3,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO moderation_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE model_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_settings ENABLE ROW LEVEL SECURITY;

-- model_anchors: Only admins can manage
CREATE POLICY "Admins can manage anchors" ON model_anchors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR')
    )
  );

-- content_moderation_scans: Creators see their own (limited), admins see all
CREATE POLICY "Creators see own scan status" ON content_moderation_scans
  FOR SELECT USING (
    creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins manage all scans" ON content_moderation_scans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR')
    )
  );

-- moderation_jobs: Admin only
CREATE POLICY "Admins manage jobs" ON moderation_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- moderation_audit_log: Admin read only
CREATE POLICY "Admins read audit log" ON moderation_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- moderation_settings: Admin only
CREATE POLICY "Admins manage settings" ON moderation_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get next job from queue
CREATE OR REPLACE FUNCTION claim_moderation_job(p_worker_id TEXT)
RETURNS moderation_jobs AS $$
DECLARE
  v_job moderation_jobs;
BEGIN
  UPDATE moderation_jobs
  SET 
    status = 'processing',
    worker_id = p_worker_id,
    started_at = NOW(),
    attempts = attempts + 1,
    last_attempt_at = NOW(),
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM moderation_jobs
    WHERE status = 'queued'
    ORDER BY priority ASC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO v_job;
  
  RETURN v_job;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a job
CREATE OR REPLACE FUNCTION complete_moderation_job(
  p_job_id UUID,
  p_success BOOLEAN,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE moderation_jobs
  SET 
    status = CASE 
      WHEN p_success THEN 'completed'
      WHEN attempts >= max_attempts THEN 'failed'
      ELSE 'queued'
    END,
    last_error = p_error,
    completed_at = CASE WHEN p_success THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_moderation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_content_moderation_scans_updated_at
  BEFORE UPDATE ON content_moderation_scans
  FOR EACH ROW EXECUTE FUNCTION update_moderation_updated_at();

CREATE TRIGGER tr_moderation_jobs_updated_at
  BEFORE UPDATE ON moderation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_moderation_updated_at();

-- ============================================
-- VIEWS (for admin convenience)
-- ============================================

CREATE OR REPLACE VIEW v_pending_moderation AS
SELECT 
  cms.*,
  cm.display_name as model_name,
  cm.avatar_url as model_avatar,
  c.legal_name as creator_name,
  c.business_name,
  c.contact_email as creator_email,
  (
    SELECT COUNT(*) FROM model_anchors ma 
    WHERE ma.model_id = cms.model_id AND ma.is_active = true
  ) as anchor_count
FROM content_moderation_scans cms
JOIN creator_models cm ON cms.model_id = cm.id
JOIN creators c ON cms.creator_id = c.id
WHERE cms.status = 'pending_review'
ORDER BY 
  CASE WHEN cms.minor_risk_score >= 50 THEN 0 ELSE 1 END,
  cms.created_at ASC;

-- Grant access to view
GRANT SELECT ON v_pending_moderation TO authenticated;

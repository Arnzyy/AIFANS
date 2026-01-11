-- ============================================
-- CONTENT MODERATION SYSTEM
-- AI-powered image scanning for platform safety
-- ============================================

-- ===========================================
-- MODERATION SETTINGS (platform-wide config)
-- ===========================================

CREATE TABLE IF NOT EXISTS moderation_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',

    -- Auto-approve thresholds (lower = stricter)
    auto_approve_max_celebrity_risk INTEGER DEFAULT 30,
    auto_approve_min_face_consistency INTEGER DEFAULT 70,
    auto_approve_max_deepfake_risk INTEGER DEFAULT 30,
    auto_approve_max_real_person_risk INTEGER DEFAULT 40,

    -- Auto-reject thresholds
    auto_reject_min_minor_risk INTEGER DEFAULT 70,

    -- Review thresholds (triggers human review)
    review_min_celebrity_risk INTEGER DEFAULT 50,
    review_min_face_consistency_drop INTEGER DEFAULT 50,
    review_min_deepfake_risk INTEGER DEFAULT 50,

    -- Feature flags
    enabled BOOLEAN DEFAULT TRUE,
    scan_on_upload BOOLEAN DEFAULT TRUE,
    scan_on_onboarding BOOLEAN DEFAULT TRUE,
    require_anchors_for_consistency BOOLEAN DEFAULT TRUE,

    -- Anchor settings
    max_anchors_per_model INTEGER DEFAULT 10,
    min_anchors_for_consistency INTEGER DEFAULT 3,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO moderation_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- ===========================================
-- MODEL ANCHORS (baseline reference images)
-- ===========================================

CREATE TABLE IF NOT EXISTS model_anchors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES creator_models(id) ON DELETE CASCADE,

    -- Storage
    r2_key TEXT NOT NULL,
    r2_url TEXT,

    -- Metadata
    created_by UUID REFERENCES profiles(id),
    note TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_anchors_model ON model_anchors(model_id);
CREATE INDEX IF NOT EXISTS idx_model_anchors_active ON model_anchors(model_id, is_active);

-- ===========================================
-- CONTENT MODERATION SCANS
-- ===========================================

CREATE TABLE IF NOT EXISTS content_moderation_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Target info
    target_type VARCHAR(30) NOT NULL, -- 'content_upload', 'onboarding', 'avatar', 'banner'
    target_id UUID, -- ID of the content item being scanned
    model_id UUID REFERENCES creator_models(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,

    -- Storage reference
    r2_key TEXT NOT NULL,
    r2_url TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending_scan',
    -- pending_scan, scanning, pending_review, approved, rejected, failed

    -- AI Analysis scores (0-100)
    face_consistency_score INTEGER,
    celebrity_risk_score INTEGER,
    real_person_risk_score INTEGER,
    deepfake_risk_score INTEGER,
    minor_risk_score INTEGER,

    -- Flags array
    flags TEXT[] DEFAULT '{}',

    -- AI summary
    staff_summary TEXT,
    scan_confidence INTEGER,

    -- Scan metadata
    scanned_at TIMESTAMPTZ,
    scan_duration_ms INTEGER,
    scan_model VARCHAR(50),
    raw_response JSONB,

    -- Human review (if required)
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    review_action VARCHAR(20), -- 'approved', 'rejected', 'escalated'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_scans_status ON content_moderation_scans(status);
CREATE INDEX IF NOT EXISTS idx_mod_scans_model ON content_moderation_scans(model_id);
CREATE INDEX IF NOT EXISTS idx_mod_scans_creator ON content_moderation_scans(creator_id);
CREATE INDEX IF NOT EXISTS idx_mod_scans_pending ON content_moderation_scans(status) WHERE status IN ('pending_scan', 'pending_review');

-- ===========================================
-- MODERATION JOB QUEUE
-- ===========================================

CREATE TABLE IF NOT EXISTS moderation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Job type
    target_type VARCHAR(30) NOT NULL, -- 'content_upload', 'model_onboarding', 'bulk_rescan'
    target_id UUID NOT NULL, -- References content_moderation_scans.id

    -- Priority (1 = highest, 10 = lowest)
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

    -- Status
    status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed', 'cancelled'

    -- Worker info
    worker_id TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Retry tracking
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_jobs_status ON moderation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mod_jobs_priority ON moderation_jobs(priority, created_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_mod_jobs_worker ON moderation_jobs(worker_id) WHERE status = 'processing';

-- ===========================================
-- MODERATION AUDIT LOG (immutable)
-- ===========================================

CREATE TABLE IF NOT EXISTS moderation_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    scan_id UUID REFERENCES content_moderation_scans(id),
    model_id UUID,
    creator_id UUID,

    -- Actor
    actor_id UUID REFERENCES profiles(id),
    actor_type VARCHAR(20) NOT NULL, -- 'system', 'admin', 'moderator'

    -- Action
    action VARCHAR(50) NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),

    -- Details
    details JSONB DEFAULT '{}',

    -- Immutable timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_audit_scan ON moderation_audit_log(scan_id);
CREATE INDEX IF NOT EXISTS idx_mod_audit_model ON moderation_audit_log(model_id);
CREATE INDEX IF NOT EXISTS idx_mod_audit_created ON moderation_audit_log(created_at DESC);

-- ===========================================
-- DATABASE FUNCTIONS
-- ===========================================

-- Function to atomically claim a job from the queue
CREATE OR REPLACE FUNCTION claim_moderation_job(p_worker_id TEXT)
RETURNS moderation_jobs AS $$
DECLARE
    claimed_job moderation_jobs;
BEGIN
    -- Find and claim the highest priority queued job
    UPDATE moderation_jobs
    SET
        status = 'processing',
        worker_id = p_worker_id,
        started_at = NOW(),
        attempts = attempts + 1,
        updated_at = NOW()
    WHERE id = (
        SELECT id FROM moderation_jobs
        WHERE status = 'queued'
        AND attempts < max_attempts
        ORDER BY priority ASC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING * INTO claimed_job;

    RETURN claimed_job;
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
        status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
        completed_at = NOW(),
        last_error = p_error,
        updated_at = NOW()
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get moderation stats
CREATE OR REPLACE FUNCTION get_moderation_stats(start_date TIMESTAMPTZ)
RETURNS TABLE (
    pending_scans BIGINT,
    pending_reviews BIGINT,
    approved_today BIGINT,
    rejected_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM content_moderation_scans WHERE status = 'pending_scan'),
        (SELECT COUNT(*) FROM content_moderation_scans WHERE status = 'pending_review'),
        (SELECT COUNT(*) FROM content_moderation_scans WHERE status = 'approved' AND updated_at >= start_date),
        (SELECT COUNT(*) FROM content_moderation_scans WHERE status = 'rejected' AND updated_at >= start_date);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- RLS POLICIES
-- ===========================================

ALTER TABLE moderation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_audit_log ENABLE ROW LEVEL SECURITY;

-- Settings: admin only
CREATE POLICY "Admins can view moderation settings" ON moderation_settings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
    );

CREATE POLICY "Service can manage moderation settings" ON moderation_settings
    FOR ALL USING (true);

-- Anchors: creators can view their own, admins can manage all
CREATE POLICY "Creators can view own model anchors" ON model_anchors
    FOR SELECT USING (
        model_id IN (
            SELECT cm.id FROM creator_models cm
            JOIN creators c ON cm.creator_id = c.id
            WHERE c.user_id = auth.uid()
        )
    );

CREATE POLICY "Service can manage anchors" ON model_anchors
    FOR ALL USING (true);

-- Scans: creators can view their own, admins can manage all
CREATE POLICY "Creators can view own scans" ON content_moderation_scans
    FOR SELECT USING (
        creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
    );

CREATE POLICY "Service can manage scans" ON content_moderation_scans
    FOR ALL USING (true);

-- Jobs: service role only
CREATE POLICY "Service can manage jobs" ON moderation_jobs
    FOR ALL USING (true);

-- Audit log: admins can view, system can insert
CREATE POLICY "Admins can view audit log" ON moderation_audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
    );

CREATE POLICY "Service can insert audit log" ON moderation_audit_log
    FOR INSERT WITH CHECK (true);

-- ===========================================
-- TRIGGERS
-- ===========================================

CREATE TRIGGER update_content_moderation_scans_updated_at
    BEFORE UPDATE ON content_moderation_scans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_moderation_jobs_updated_at
    BEFORE UPDATE ON moderation_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

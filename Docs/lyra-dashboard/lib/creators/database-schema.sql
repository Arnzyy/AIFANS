-- =============================================
-- LYRA — CREATOR ONBOARDING, MODELS, CONTENT, PPV
-- Complete Database Schema
-- =============================================

-- =====================
-- ENUMS
-- =====================

-- Creator status
DO $$ BEGIN
  CREATE TYPE creator_status AS ENUM (
    'INCOMPLETE',      -- Still filling onboarding
    'PENDING_REVIEW',  -- Submitted, awaiting admin
    'APPROVED',        -- Can publish and earn
    'REJECTED',        -- Rejected by admin
    'SUSPENDED'        -- Suspended for violations
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Creator account type
DO $$ BEGIN
  CREATE TYPE creator_account_type AS ENUM ('INDIVIDUAL', 'BUSINESS');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Model status
DO $$ BEGIN
  CREATE TYPE model_status AS ENUM (
    'DRAFT',           -- Not submitted
    'PENDING_REVIEW',  -- Awaiting admin approval
    'APPROVED',        -- Live and discoverable
    'REJECTED',        -- Rejected by admin
    'SUSPENDED'        -- Suspended for violations
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Content type
DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('IMAGE', 'VIDEO', 'TEXT', 'AUDIO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Content visibility
DO $$ BEGIN
  CREATE TYPE content_visibility AS ENUM (
    'PUBLIC_PREVIEW',  -- SFW, visible to all
    'SUBSCRIBERS',     -- Subscribers only
    'PPV'              -- Pay-per-view unlock
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PPV status
DO $$ BEGIN
  CREATE TYPE ppv_status AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'DELETED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Audit action types
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'CREATOR_SUBMITTED',
    'CREATOR_APPROVED',
    'CREATOR_REJECTED',
    'CREATOR_SUSPENDED',
    'MODEL_SUBMITTED',
    'MODEL_APPROVED',
    'MODEL_REJECTED',
    'MODEL_SUSPENDED',
    'CONTENT_UPLOADED',
    'CONTENT_REMOVED',
    'CONTENT_RESTORED',
    'PPV_CREATED',
    'PPV_PURCHASED',
    'DECLARATION_ACCEPTED',
    'STRIKE_ISSUED',
    'STRIKE_REMOVED',
    'PAYOUT_REQUESTED',
    'PAYOUT_COMPLETED',
    'ADMIN_NOTE_ADDED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Strike severity
DO $$ BEGIN
  CREATE TYPE strike_severity AS ENUM ('WARNING', 'STRIKE', 'FINAL_WARNING', 'BAN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================
-- 1. CREATORS TABLE
-- Legal entity & payout identity
-- =====================

CREATE TABLE IF NOT EXISTS creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Account type
  account_type creator_account_type DEFAULT 'INDIVIDUAL',
  country_code VARCHAR(2),
  
  -- Legal identity
  legal_name VARCHAR(255),
  business_name VARCHAR(255),
  date_of_birth DATE,
  
  -- Contact
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  
  -- Stripe Connect
  stripe_connect_account_id VARCHAR(100),
  stripe_connect_onboarding_complete BOOLEAN DEFAULT false,
  stripe_payouts_enabled BOOLEAN DEFAULT false,
  stripe_charges_enabled BOOLEAN DEFAULT false,
  stripe_requirements_due JSONB DEFAULT '[]',
  
  -- Status
  status creator_status DEFAULT 'INCOMPLETE',
  onboarding_step INTEGER DEFAULT 1,
  onboarding_completed_at TIMESTAMPTZ,
  
  -- Limits & Trust
  max_models_allowed INTEGER DEFAULT 1,
  trust_level INTEGER DEFAULT 0,
  
  -- Declarations
  declarations_accepted_at TIMESTAMPTZ,
  declarations_version VARCHAR(20),
  
  -- Admin notes
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ
);

CREATE INDEX idx_creators_user ON creators(user_id);
CREATE INDEX idx_creators_status ON creators(status);
CREATE INDEX idx_creators_stripe ON creators(stripe_connect_account_id);

-- =====================
-- 2. CREATOR DECLARATIONS
-- Immutable compliance records
-- =====================

CREATE TABLE IF NOT EXISTS creator_declarations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  
  declaration_type VARCHAR(100) NOT NULL,
  declaration_text TEXT NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_declarations_creator ON creator_declarations(creator_id);

-- =====================
-- 3. CREATOR MODELS (AI Personas)
-- =====================

CREATE TABLE IF NOT EXISTS creator_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  
  -- Basic info
  display_name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  age INTEGER NOT NULL CHECK (age >= 18),
  primary_language VARCHAR(10) DEFAULT 'en',
  
  -- Profile
  bio TEXT,
  tagline VARCHAR(255),
  
  -- Visuals
  avatar_url TEXT,
  cover_url TEXT,
  gallery_urls JSONB DEFAULT '[]',
  
  -- Persona details
  persona_traits JSONB DEFAULT '[]',
  interests JSONB DEFAULT '[]',
  style_preferences JSONB DEFAULT '{}',
  personal_details JSONB DEFAULT '{}',
  
  -- Tags
  primary_tag_id UUID REFERENCES tags(id),
  
  -- Chat settings
  nsfw_enabled BOOLEAN DEFAULT true,
  sfw_enabled BOOLEAN DEFAULT true,
  
  -- Monetization
  subscription_price_monthly INTEGER,  -- in pence
  subscription_currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Status
  status model_status DEFAULT 'DRAFT',
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- Metrics
  subscriber_count INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ
);

CREATE INDEX idx_models_creator ON creator_models(creator_id);
CREATE INDEX idx_models_status ON creator_models(status);
CREATE INDEX idx_models_slug ON creator_models(slug);
CREATE INDEX idx_models_approved ON creator_models(status, approved_at) WHERE status = 'APPROVED';

-- =====================
-- 4. CONTENT LIBRARY
-- Media uploads
-- =====================

CREATE TABLE IF NOT EXISTS content_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES creator_models(id) ON DELETE CASCADE,
  
  -- Content details
  type content_type NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Metadata
  filename VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  duration_seconds INTEGER,  -- for video/audio
  width INTEGER,
  height INTEGER,
  
  -- Visibility & flags
  visibility content_visibility DEFAULT 'SUBSCRIBERS',
  is_nsfw BOOLEAN DEFAULT false,
  content_flags JSONB DEFAULT '[]',  -- ['lingerie', 'nudity', etc.]
  
  -- Status
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_creator ON content_items(creator_id);
CREATE INDEX idx_content_model ON content_items(model_id);
CREATE INDEX idx_content_visibility ON content_items(model_id, visibility);

-- =====================
-- 5. POSTS
-- Content groupings with captions
-- =====================

CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES creator_models(id) ON DELETE CASCADE,
  
  -- Content
  caption TEXT,
  content_item_ids UUID[] DEFAULT '{}',
  
  -- Visibility
  visibility content_visibility DEFAULT 'SUBSCRIBERS',
  
  -- PPV (if applicable)
  is_ppv BOOLEAN DEFAULT false,
  ppv_id UUID REFERENCES ppv_offers(id),
  
  -- Engagement
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Status
  is_pinned BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_model ON posts(model_id);
CREATE INDEX idx_posts_creator ON posts(creator_id);
CREATE INDEX idx_posts_published ON posts(model_id, published_at) WHERE NOT is_deleted;

-- =====================
-- 6. PPV OFFERS
-- Pay-per-view content packs
-- =====================

CREATE TABLE IF NOT EXISTS ppv_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES creator_models(id) ON DELETE CASCADE,
  
  -- Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  preview_url TEXT,
  
  -- Content
  content_item_ids UUID[] NOT NULL DEFAULT '{}',
  
  -- Pricing
  price_tokens INTEGER NOT NULL,
  price_gbp_minor INTEGER NOT NULL,
  
  -- Audience
  subscribers_only BOOLEAN DEFAULT true,
  
  -- Status
  status ppv_status DEFAULT 'DRAFT',
  
  -- Metrics
  purchase_count INTEGER DEFAULT 0,
  total_revenue_tokens INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_ppv_model ON ppv_offers(model_id);
CREATE INDEX idx_ppv_creator ON ppv_offers(creator_id);
CREATE INDEX idx_ppv_active ON ppv_offers(model_id, status) WHERE status = 'ACTIVE';

-- =====================
-- 7. PPV ENTITLEMENTS
-- User purchases
-- =====================

CREATE TABLE IF NOT EXISTS ppv_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ppv_id UUID NOT NULL REFERENCES ppv_offers(id),
  model_id UUID NOT NULL REFERENCES creator_models(id),
  creator_id UUID NOT NULL REFERENCES creators(id),
  
  -- Purchase details
  price_tokens INTEGER NOT NULL,
  price_gbp_minor INTEGER NOT NULL,
  
  -- Split
  platform_fee_tokens INTEGER NOT NULL,
  creator_share_tokens INTEGER NOT NULL,
  
  -- Timestamps
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, ppv_id)
);

CREATE INDEX idx_ppv_entitlements_user ON ppv_entitlements(user_id);
CREATE INDEX idx_ppv_entitlements_ppv ON ppv_entitlements(ppv_id);

-- =====================
-- 8. SUBSCRIPTIONS
-- Model subscriptions
-- =====================

CREATE TABLE IF NOT EXISTS model_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  model_id UUID NOT NULL REFERENCES creator_models(id),
  creator_id UUID NOT NULL REFERENCES creators(id),
  
  -- Stripe
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- active, canceled, past_due, expired
  
  -- Pricing at time of subscription
  price_monthly INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Dates
  started_at TIMESTAMPTZ DEFAULT NOW(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  UNIQUE(user_id, model_id)
);

CREATE INDEX idx_subs_user ON model_subscriptions(user_id);
CREATE INDEX idx_subs_model ON model_subscriptions(model_id);
CREATE INDEX idx_subs_active ON model_subscriptions(model_id, status) WHERE status = 'active';

-- =====================
-- 9. CREATOR PAYOUTS
-- Payout tracking
-- =====================

CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id),
  
  -- Amount
  amount_tokens INTEGER NOT NULL,
  amount_gbp_minor INTEGER NOT NULL,
  
  -- Stripe
  stripe_transfer_id VARCHAR(100),
  stripe_payout_id VARCHAR(100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
  
  -- Period
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  
  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT
);

CREATE INDEX idx_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX idx_payouts_status ON creator_payouts(status);

-- =====================
-- 10. CREATOR EARNINGS LEDGER
-- Detailed earnings tracking
-- =====================

DO $$ BEGIN
  CREATE TYPE earning_type AS ENUM (
    'SUBSCRIPTION',
    'TIP',
    'PPV_SALE',
    'MESSAGE_FEE',
    'REFUND',
    'CHARGEBACK',
    'PAYOUT',
    'ADJUSTMENT'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS creator_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id),
  model_id UUID REFERENCES creator_models(id),
  
  -- Type
  type earning_type NOT NULL,
  
  -- Amounts
  gross_amount_tokens INTEGER NOT NULL,
  platform_fee_tokens INTEGER NOT NULL,
  net_amount_tokens INTEGER NOT NULL,
  
  -- GBP equivalents
  gross_amount_gbp INTEGER NOT NULL,
  platform_fee_gbp INTEGER NOT NULL,
  net_amount_gbp INTEGER NOT NULL,
  
  -- References
  related_user_id UUID REFERENCES auth.users(id),
  related_subscription_id UUID,
  related_tip_id UUID,
  related_ppv_id UUID,
  related_payout_id UUID,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',  -- pending, available, paid_out, reversed
  available_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_earnings_creator ON creator_earnings(creator_id);
CREATE INDEX idx_earnings_status ON creator_earnings(creator_id, status);
CREATE INDEX idx_earnings_available ON creator_earnings(creator_id, available_at) WHERE status = 'available';

-- =====================
-- 11. STRIKES & WARNINGS
-- Enforcement system
-- =====================

CREATE TABLE IF NOT EXISTS creator_strikes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES creators(id),
  model_id UUID REFERENCES creator_models(id),
  
  -- Strike details
  severity strike_severity NOT NULL,
  reason TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]',
  
  -- Admin
  issued_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  appealed BOOLEAN DEFAULT false,
  appeal_text TEXT,
  appeal_resolved_at TIMESTAMPTZ,
  appeal_outcome TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES auth.users(id),
  removed_reason TEXT
);

CREATE INDEX idx_strikes_creator ON creator_strikes(creator_id);
CREATE INDEX idx_strikes_active ON creator_strikes(creator_id, is_active) WHERE is_active = true;

-- =====================
-- 12. CONTENT REPORTS
-- User reports
-- =====================

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Reporter
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Target
  reported_creator_id UUID REFERENCES creators(id),
  reported_model_id UUID REFERENCES creator_models(id),
  reported_content_id UUID REFERENCES content_items(id),
  reported_post_id UUID REFERENCES posts(id),
  
  -- Report details
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Status
  status report_status DEFAULT 'PENDING',
  
  -- Resolution
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  action_taken TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_status ON content_reports(status);
CREATE INDEX idx_reports_creator ON content_reports(reported_creator_id);

-- =====================
-- 13. AUDIT LOG
-- Immutable records
-- =====================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Actor
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_type VARCHAR(20) NOT NULL,  -- 'ADMIN', 'CREATOR', 'USER', 'SYSTEM'
  
  -- Action
  action audit_action NOT NULL,
  
  -- Target
  target_creator_id UUID REFERENCES creators(id),
  target_model_id UUID REFERENCES creator_models(id),
  target_content_id UUID REFERENCES content_items(id),
  target_user_id UUID REFERENCES auth.users(id),
  
  -- Details
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Timestamp (immutable)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_creator ON audit_log(target_creator_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- =====================
-- 14. ADMIN USERS
-- Role management
-- =====================

DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  role admin_role NOT NULL,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- =====================
-- 15. PLATFORM CONFIG
-- Global settings
-- =====================

INSERT INTO platform_config (key, value, description) VALUES
  ('creator_payout_schedule', '"weekly"', 'Payout frequency: daily, weekly, monthly'),
  ('creator_payout_hold_days', '14', 'Days to hold earnings before available'),
  ('creator_minimum_payout_gbp', '1000', 'Minimum payout threshold in pence (£10)'),
  ('creator_platform_fee_pct', '20', 'Platform fee percentage on subscriptions'),
  ('ppv_platform_fee_pct', '20', 'Platform fee percentage on PPV sales'),
  ('default_max_models', '1', 'Default max models for new creators'),
  ('trust_level_for_extra_models', '3', 'Trust level needed for additional models')
ON CONFLICT (key) DO NOTHING;

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppv_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppv_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Creators can view/edit their own data
CREATE POLICY "Creators own data" ON creators
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Creators own declarations" ON creator_declarations
  FOR ALL USING (creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid()));

CREATE POLICY "Creators own models" ON creator_models
  FOR ALL USING (creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid()));

-- Public can view approved models
CREATE POLICY "Public view approved models" ON creator_models
  FOR SELECT USING (status = 'APPROVED');

CREATE POLICY "Creators own content" ON content_items
  FOR ALL USING (creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid()));

CREATE POLICY "Creators own posts" ON posts
  FOR ALL USING (creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid()));

CREATE POLICY "Creators own ppv" ON ppv_offers
  FOR ALL USING (creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid()));

-- Users can view their own entitlements
CREATE POLICY "Users own entitlements" ON ppv_entitlements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users own subscriptions" ON model_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Creators view own earnings" ON creator_earnings
  FOR SELECT USING (creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid()));

CREATE POLICY "Creators view own payouts" ON creator_payouts
  FOR SELECT USING (creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid()));

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Get creator by user ID
CREATE OR REPLACE FUNCTION get_creator_by_user(p_user_id UUID)
RETURNS creators AS $$
DECLARE
  v_creator creators;
BEGIN
  SELECT * INTO v_creator FROM creators WHERE user_id = p_user_id;
  RETURN v_creator;
END;
$$ LANGUAGE plpgsql;

-- Check if user is subscribed to model
CREATE OR REPLACE FUNCTION is_subscribed(p_user_id UUID, p_model_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM model_subscriptions
    WHERE user_id = p_user_id
    AND model_id = p_model_id
    AND status = 'active'
    AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Check if user has PPV entitlement
CREATE OR REPLACE FUNCTION has_ppv_access(p_user_id UUID, p_ppv_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ppv_entitlements
    WHERE user_id = p_user_id
    AND ppv_id = p_ppv_id
  );
END;
$$ LANGUAGE plpgsql;

-- Get creator's active strike count
CREATE OR REPLACE FUNCTION get_active_strike_count(p_creator_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM creator_strikes
    WHERE creator_id = p_creator_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Calculate creator's available balance
CREATE OR REPLACE FUNCTION get_creator_available_balance(p_creator_id UUID)
RETURNS TABLE(tokens INTEGER, gbp INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(net_amount_tokens), 0)::INTEGER,
    COALESCE(SUM(net_amount_gbp), 0)::INTEGER
  FROM creator_earnings
  WHERE creator_id = p_creator_id
  AND status = 'available';
END;
$$ LANGUAGE plpgsql;

-- Submit creator for review
CREATE OR REPLACE FUNCTION submit_creator_for_review(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_creator creators;
BEGIN
  SELECT * INTO v_creator FROM creators WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Creator profile not found';
    RETURN;
  END IF;
  
  -- Check required fields
  IF v_creator.legal_name IS NULL OR v_creator.legal_name = '' THEN
    RETURN QUERY SELECT false, 'Legal name is required';
    RETURN;
  END IF;
  
  IF v_creator.declarations_accepted_at IS NULL THEN
    RETURN QUERY SELECT false, 'Declarations must be accepted';
    RETURN;
  END IF;
  
  -- Update status
  UPDATE creators SET 
    status = 'PENDING_REVIEW',
    onboarding_completed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log
  INSERT INTO audit_log (actor_id, actor_type, action, target_creator_id, new_value)
  VALUES (p_user_id, 'CREATOR', 'CREATOR_SUBMITTED', v_creator.id, 
    jsonb_build_object('status', 'PENDING_REVIEW'));
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Submit model for review
CREATE OR REPLACE FUNCTION submit_model_for_review(p_model_id UUID, p_user_id UUID)
RETURNS TABLE(success BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_model creator_models;
  v_creator creators;
BEGIN
  -- Get creator
  SELECT * INTO v_creator FROM creators WHERE user_id = p_user_id;
  
  IF NOT FOUND OR v_creator.status != 'APPROVED' THEN
    RETURN QUERY SELECT false, 'Creator must be approved first';
    RETURN;
  END IF;
  
  -- Get model
  SELECT * INTO v_model FROM creator_models 
  WHERE id = p_model_id AND creator_id = v_creator.id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Model not found';
    RETURN;
  END IF;
  
  -- Check model count
  IF (SELECT COUNT(*) FROM creator_models 
      WHERE creator_id = v_creator.id 
      AND status IN ('PENDING_REVIEW', 'APPROVED')) >= v_creator.max_models_allowed THEN
    RETURN QUERY SELECT false, 'Maximum model limit reached';
    RETURN;
  END IF;
  
  -- Validate required fields
  IF v_model.display_name IS NULL OR v_model.avatar_url IS NULL THEN
    RETURN QUERY SELECT false, 'Display name and avatar are required';
    RETURN;
  END IF;
  
  IF v_model.age < 18 THEN
    RETURN QUERY SELECT false, 'Model must be 18+';
    RETURN;
  END IF;
  
  -- Update status
  UPDATE creator_models SET 
    status = 'PENDING_REVIEW',
    submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_model_id;
  
  -- Log
  INSERT INTO audit_log (actor_id, actor_type, action, target_model_id, new_value)
  VALUES (p_user_id, 'CREATOR', 'MODEL_SUBMITTED', p_model_id,
    jsonb_build_object('status', 'PENDING_REVIEW'));
  
  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- TRIGGERS
-- =====================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creators_updated BEFORE UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER models_updated BEFORE UPDATE ON creator_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER content_updated BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER posts_updated BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER ppv_updated BEFORE UPDATE ON ppv_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate slug for models
CREATE OR REPLACE FUNCTION generate_model_slug()
RETURNS TRIGGER AS $$
DECLARE
  v_slug TEXT;
  v_count INTEGER;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    v_slug := LOWER(REGEXP_REPLACE(NEW.display_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := TRIM(BOTH '-' FROM v_slug);
    
    -- Check for duplicates
    SELECT COUNT(*) INTO v_count FROM creator_models WHERE slug = v_slug;
    IF v_count > 0 THEN
      v_slug := v_slug || '-' || FLOOR(RANDOM() * 10000)::TEXT;
    END IF;
    
    NEW.slug := v_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER model_slug_trigger BEFORE INSERT ON creator_models
  FOR EACH ROW EXECUTE FUNCTION generate_model_slug();

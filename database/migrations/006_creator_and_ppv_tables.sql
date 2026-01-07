-- ============================================
-- CREATOR & PPV SYSTEM TABLES
-- Complete schema for creator management and PPV
-- ============================================

-- ===========================================
-- CREATORS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Business info
    business_name VARCHAR(255),
    business_type VARCHAR(20) NOT NULL DEFAULT 'individual',
    country VARCHAR(2) NOT NULL DEFAULT 'GB',

    -- KYC & Verification
    kyc_status VARCHAR(20) DEFAULT 'not_started',
    id_verified BOOLEAN DEFAULT FALSE,

    -- Stripe Connect
    stripe_account_id VARCHAR(255),
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    stripe_charges_enabled BOOLEAN DEFAULT FALSE,
    stripe_payouts_enabled BOOLEAN DEFAULT FALSE,

    -- Platform status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    onboarding_step VARCHAR(50) DEFAULT 'account_type',
    onboarding_complete BOOLEAN DEFAULT FALSE,

    -- Profile
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,

    -- Settings
    max_models INTEGER DEFAULT 3,
    platform_fee_override DECIMAL(5,4),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,

    UNIQUE(user_id)
);

-- ===========================================
-- CREATOR DECLARATIONS (IMMUTABLE)
-- ===========================================

CREATE TABLE IF NOT EXISTS creator_declarations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

    declaration_type VARCHAR(50) NOT NULL,
    declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,

    UNIQUE(creator_id, declaration_type)
);

-- ===========================================
-- CREATOR MODELS (AI PERSONAS)
-- ===========================================

CREATE TABLE IF NOT EXISTS creator_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

    -- Basic info
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18),
    bio TEXT,

    -- Profile
    avatar_url TEXT,
    banner_url TEXT,

    -- Persona
    personality_traits TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    backstory TEXT,
    speaking_style TEXT,

    -- Visuals
    physical_traits JSONB DEFAULT '{}',

    -- Chat settings
    turn_ons TEXT[] DEFAULT '{}',
    turn_offs TEXT[] DEFAULT '{}',
    emoji_usage VARCHAR(20) DEFAULT 'moderate',
    response_length VARCHAR(20) DEFAULT 'medium',

    -- Pricing
    subscription_price INTEGER DEFAULT 0, -- in pence/cents
    price_per_message INTEGER DEFAULT 0, -- in tokens

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    is_active BOOLEAN DEFAULT FALSE,

    -- Content flags
    nsfw_enabled BOOLEAN DEFAULT TRUE,
    sfw_enabled BOOLEAN DEFAULT TRUE,
    default_chat_mode VARCHAR(10) DEFAULT 'sfw',

    -- Stats (denormalized)
    subscriber_count INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    total_earnings INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- ===========================================
-- TAGS SYSTEM
-- ===========================================

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(20) DEFAULT 'secondary', -- 'primary' or 'secondary'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_tags (
    model_id UUID NOT NULL REFERENCES creator_models(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (model_id, tag_id)
);

CREATE TABLE IF NOT EXISTS blocked_tag_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term VARCHAR(100) NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- CONTENT ITEMS
-- ===========================================

CREATE TABLE IF NOT EXISTS content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    model_id UUID REFERENCES creator_models(id) ON DELETE SET NULL,

    -- Media
    type VARCHAR(20) NOT NULL, -- 'image', 'video', 'audio'
    url TEXT NOT NULL,
    thumbnail_url TEXT,

    -- Metadata
    title VARCHAR(255),
    description TEXT,

    -- Visibility
    visibility VARCHAR(20) DEFAULT 'subscribers', -- 'public', 'subscribers', 'ppv'
    is_nsfw BOOLEAN DEFAULT FALSE,

    -- Stats
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PPV (PAY-PER-VIEW) SYSTEM
-- ===========================================

CREATE TABLE IF NOT EXISTS ppv_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    model_id UUID REFERENCES creator_models(id) ON DELETE SET NULL,

    -- Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    preview_url TEXT,

    -- Pricing
    price_tokens INTEGER NOT NULL CHECK (price_tokens >= 100),

    -- Content
    content_ids UUID[] NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Stats
    purchase_count INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ppv_entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ppv_offer_id UUID NOT NULL REFERENCES ppv_offers(id) ON DELETE CASCADE,

    -- Transaction
    amount_tokens INTEGER NOT NULL,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Access
    expires_at TIMESTAMPTZ, -- null = permanent

    UNIQUE(user_id, ppv_offer_id)
);

-- ===========================================
-- MODERATION
-- ===========================================

CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Target
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,

    -- Report details
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    evidence_urls TEXT[],

    -- Status
    status VARCHAR(20) DEFAULT 'pending',

    -- Resolution
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    action_taken TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creator_strikes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

    -- Details
    type VARCHAR(20) NOT NULL, -- 'warning', 'strike', 'suspension', 'ban'
    reason TEXT NOT NULL,

    -- Related report
    report_id UUID REFERENCES content_reports(id),

    -- Admin
    issued_by UUID NOT NULL REFERENCES profiles(id),

    -- Appeal
    appealed BOOLEAN DEFAULT FALSE,
    appeal_notes TEXT,
    appeal_resolved_at TIMESTAMPTZ,
    appeal_outcome VARCHAR(20), -- 'upheld', 'overturned'

    -- Timestamps
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ===========================================
-- ADMIN
-- ===========================================

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'admin', 'moderator'
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES profiles(id),
    UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id),

    -- Action
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,

    -- Details
    details JSONB DEFAULT '{}',

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp (immutable)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- CREATOR PAYOUTS
-- ===========================================

CREATE TABLE IF NOT EXISTS creator_payout_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,

    -- Type
    type VARCHAR(30) NOT NULL, -- 'subscription', 'ppv_sale', 'tip', 'payout', 'adjustment'

    -- Amounts
    amount_tokens INTEGER NOT NULL,
    amount_gbp_minor INTEGER, -- in pence

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'available', 'paid', 'cancelled'

    -- Reference
    reference_id UUID,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    available_at TIMESTAMPTZ, -- After hold period
    paid_at TIMESTAMPTZ
);

-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_creators_user_id ON creators(user_id);
CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);

CREATE INDEX IF NOT EXISTS idx_creator_models_creator_id ON creator_models(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_models_status ON creator_models(status);

CREATE INDEX IF NOT EXISTS idx_model_tags_model_id ON model_tags(model_id);
CREATE INDEX IF NOT EXISTS idx_model_tags_tag_id ON model_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_content_items_creator_id ON content_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_items_model_id ON content_items(model_id);
CREATE INDEX IF NOT EXISTS idx_content_items_visibility ON content_items(visibility);

CREATE INDEX IF NOT EXISTS idx_ppv_offers_creator_id ON ppv_offers(creator_id);
CREATE INDEX IF NOT EXISTS idx_ppv_offers_is_active ON ppv_offers(is_active);

CREATE INDEX IF NOT EXISTS idx_ppv_entitlements_user_id ON ppv_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_ppv_entitlements_offer_id ON ppv_entitlements(ppv_offer_id);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_creator_strikes_creator_id ON creator_strikes(creator_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_payout_ledger_creator_id ON creator_payout_ledger(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payout_ledger_status ON creator_payout_ledger(status);

-- ===========================================
-- RLS POLICIES
-- ===========================================

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppv_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppv_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payout_ledger ENABLE ROW LEVEL SECURITY;

-- Creators can view and update their own record
CREATE POLICY "Users can view own creator profile" ON creators
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own creator profile" ON creators
    FOR UPDATE USING (user_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service can manage creators" ON creators
    FOR ALL USING (true);

-- Models visible based on status
CREATE POLICY "Public can view approved models" ON creator_models
    FOR SELECT USING (status = 'approved' AND is_active = true);

CREATE POLICY "Creators can manage own models" ON creator_models
    FOR ALL USING (
        creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
    );

-- Tags are public
CREATE POLICY "Anyone can view active tags" ON tags
    FOR SELECT USING (is_active = true);

-- Content policies
CREATE POLICY "Public can view public content" ON content_items
    FOR SELECT USING (visibility = 'public');

CREATE POLICY "Creators can manage own content" ON content_items
    FOR ALL USING (
        creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
    );

-- PPV policies
CREATE POLICY "Anyone can view active PPV offers" ON ppv_offers
    FOR SELECT USING (is_active = true);

CREATE POLICY "Creators can manage own PPV" ON ppv_offers
    FOR ALL USING (
        creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view own PPV entitlements" ON ppv_entitlements
    FOR SELECT USING (user_id = auth.uid());

-- Reports
CREATE POLICY "Users can create reports" ON content_reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Payouts
CREATE POLICY "Creators can view own payouts" ON creator_payout_ledger
    FOR SELECT USING (
        creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
    );

-- ===========================================
-- UPDATE TRIGGERS
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_creators_updated_at
    BEFORE UPDATE ON creators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_creator_models_updated_at
    BEFORE UPDATE ON creator_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_items_updated_at
    BEFORE UPDATE ON content_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ppv_offers_updated_at
    BEFORE UPDATE ON ppv_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- SEED DATA: TAGS
-- ===========================================

INSERT INTO tags (name, slug, category, description) VALUES
    ('Girlfriend Experience', 'girlfriend-experience', 'primary', 'Warm, romantic companion'),
    ('Dominant', 'dominant', 'primary', 'Confident, commanding personality'),
    ('Submissive', 'submissive', 'primary', 'Yielding, obedient personality'),
    ('Playful', 'playful', 'primary', 'Fun, teasing personality'),
    ('Mysterious', 'mysterious', 'primary', 'Enigmatic, alluring personality'),
    ('Sweet', 'sweet', 'secondary', 'Kind and caring'),
    ('Flirty', 'flirty', 'secondary', 'Playfully romantic'),
    ('Intellectual', 'intellectual', 'secondary', 'Smart and engaging'),
    ('Adventurous', 'adventurous', 'secondary', 'Bold and exciting'),
    ('Caring', 'caring', 'secondary', 'Nurturing and supportive')
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- SEED DATA: BLOCKED TERMS
-- ===========================================

INSERT INTO blocked_tag_terms (term, reason) VALUES
    ('underage', 'Prohibited content'),
    ('minor', 'Prohibited content'),
    ('child', 'Prohibited content'),
    ('teen', 'Prohibited content'),
    ('loli', 'Prohibited content'),
    ('shota', 'Prohibited content'),
    ('incest', 'Prohibited content'),
    ('rape', 'Prohibited content'),
    ('non-con', 'Prohibited content'),
    ('forced', 'Prohibited content')
ON CONFLICT (term) DO NOTHING;

-- AIFans Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('fan', 'creator', 'admin');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');
CREATE TYPE post_type AS ENUM ('free', 'subscribers_only', 'ppv');
CREATE TYPE media_type AS ENUM ('image', 'video', 'audio');
CREATE TYPE transaction_type AS ENUM ('subscription', 'ppv', 'tip', 'chat_credits', 'payout', 'refund');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE message_type AS ENUM ('text', 'image', 'video', 'ppv', 'tip');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'fan',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator legal declarations (compliance - immutable audit log)
CREATE TABLE creator_declarations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- All declarations must be TRUE to publish
    confirm_fictional_personas BOOLEAN NOT NULL DEFAULT FALSE,
    confirm_no_real_likeness BOOLEAN NOT NULL DEFAULT FALSE,
    confirm_no_deepfakes BOOLEAN NOT NULL DEFAULT FALSE,
    confirm_no_celebrities BOOLEAN NOT NULL DEFAULT FALSE,
    confirm_no_real_individuals BOOLEAN NOT NULL DEFAULT FALSE,
    confirm_owns_ai_config BOOLEAN NOT NULL DEFAULT FALSE,
    confirm_responsible_for_outputs BOOLEAN NOT NULL DEFAULT FALSE,
    confirm_accepts_takedown_policy BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    declaration_version VARCHAR(10) DEFAULT '1.0',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Declarations are append-only, never updated
    CONSTRAINT all_declarations_required CHECK (
        confirm_fictional_personas = TRUE AND
        confirm_no_real_likeness = TRUE AND
        confirm_no_deepfakes = TRUE AND
        confirm_no_celebrities = TRUE AND
        confirm_no_real_individuals = TRUE AND
        confirm_owns_ai_config = TRUE AND
        confirm_responsible_for_outputs = TRUE AND
        confirm_accepts_takedown_policy = TRUE
    )
);

-- Content reports for takedown flow
CREATE TABLE content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    reporter_id UUID REFERENCES profiles(id), -- NULL if anonymous
    
    -- What's being reported
    reported_creator_id UUID REFERENCES profiles(id),
    reported_post_id UUID REFERENCES posts(id),
    reported_message_id UUID REFERENCES messages(id),
    
    -- Report details
    report_type VARCHAR(50) NOT NULL, -- 'impersonation', 'likeness', 'misleading', 'prohibited', 'other'
    description TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewing', 'actioned', 'dismissed'
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    action_taken TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator-specific profile data
CREATE TABLE creator_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Profile content
    bio TEXT,
    banner_url TEXT,
    location VARCHAR(100),
    website_url TEXT,
    
    -- Social links
    twitter_url TEXT,
    instagram_url TEXT,
    
    -- Settings
    is_accepting_messages BOOLEAN DEFAULT TRUE,
    message_price DECIMAL(10,2) DEFAULT 0, -- Price per message (0 = free)
    minimum_tip DECIMAL(10,2) DEFAULT 5.00,
    
    -- AI Chat settings
    ai_chat_enabled BOOLEAN DEFAULT FALSE,
    ai_personality_id UUID, -- References ai_personalities
    ai_chat_price_per_message DECIMAL(10,2) DEFAULT 0.50,
    
    -- Stats (denormalized for performance)
    subscriber_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    
    -- Geo-blocking
    blocked_countries TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTION TIERS
-- ============================================

CREATE TABLE subscription_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    name VARCHAR(50) NOT NULL, -- e.g., "Basic", "Premium", "VIP"
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(10,2) NOT NULL,
    price_3_month DECIMAL(10,2), -- Optional discount
    price_yearly DECIMAL(10,2), -- Optional discount
    
    -- Benefits
    benefits TEXT[], -- Array of benefit strings
    
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
    
    status subscription_status DEFAULT 'active',
    
    -- Billing
    price_paid DECIMAL(10,2) NOT NULL,
    billing_period VARCHAR(20) NOT NULL, -- 'monthly', '3_month', 'yearly'
    
    -- Dates
    started_at TIMESTAMPTZ DEFAULT NOW(),
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,
    
    -- Payment processor reference
    external_subscription_id VARCHAR(255), -- CCBill subscription ID
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(subscriber_id, creator_id)
);

-- ============================================
-- POSTS
-- ============================================

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT, -- Text content/caption
    post_type post_type DEFAULT 'free',
    
    -- PPV settings
    ppv_price DECIMAL(10,2), -- Only if post_type = 'ppv'
    
    -- Scheduling
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ, -- For scheduled posts
    
    -- Stats (denormalized)
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    
    -- Metadata
    is_pinned BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media attached to posts
CREATE TABLE post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    media_type media_type NOT NULL,
    url TEXT NOT NULL, -- R2/S3 URL
    thumbnail_url TEXT, -- For videos
    
    -- Metadata
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER, -- For video/audio
    file_size_bytes BIGINT,
    
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PPV purchases
CREATE TABLE post_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    price_paid DECIMAL(10,2) NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(post_id, buyer_id)
);

-- Post likes
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(post_id, user_id)
);

-- ============================================
-- MESSAGES / DMs
-- ============================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    
    -- Unread counts
    unread_count_1 INTEGER DEFAULT 0, -- For participant_1
    unread_count_2 INTEGER DEFAULT 0, -- For participant_2
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(participant_1, participant_2)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    message_type message_type DEFAULT 'text',
    content TEXT,
    media_url TEXT, -- For image/video messages
    
    -- PPV message
    ppv_price DECIMAL(10,2),
    is_ppv_unlocked BOOLEAN DEFAULT FALSE,
    
    -- Tip message
    tip_amount DECIMAL(10,2),
    
    is_read BOOLEAN DEFAULT FALSE,
    is_from_ai BOOLEAN DEFAULT FALSE, -- True if sent by AI chat
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI CHAT SYSTEM
-- ============================================

-- AI personality configurations for creators
CREATE TABLE ai_personalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(100) NOT NULL,
    age INTEGER,
    backstory TEXT,
    location VARCHAR(100),
    
    -- Personality
    personality_traits TEXT[], -- ['flirty', 'playful', 'dominant']
    interests TEXT[],
    turn_ons TEXT[],
    turn_offs TEXT[],
    
    -- Communication style
    speaking_style TEXT, -- Description of how they talk
    emoji_usage VARCHAR(20) DEFAULT 'moderate', -- 'none', 'minimal', 'moderate', 'heavy'
    response_length VARCHAR(20) DEFAULT 'medium', -- 'short', 'medium', 'long'
    
    -- Advanced
    custom_system_prompt TEXT, -- Override for advanced users
    
    -- Settings
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI chat sessions (separate from regular DMs)
CREATE TABLE ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    personality_id UUID NOT NULL REFERENCES ai_personalities(id),
    
    -- Session state
    is_active BOOLEAN DEFAULT TRUE,
    total_messages INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    
    -- Memory context (for AI continuity)
    memory_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    
    -- Cost tracking
    credits_charged DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREDITS & TRANSACTIONS
-- ============================================

-- User credit balance
CREATE TABLE credit_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    balance DECIMAL(12,2) DEFAULT 0,
    lifetime_purchased DECIMAL(12,2) DEFAULT 0,
    lifetime_spent DECIMAL(12,2) DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- All financial transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parties
    user_id UUID NOT NULL REFERENCES profiles(id), -- Who paid
    creator_id UUID REFERENCES profiles(id), -- Who receives (null for credit purchases)
    
    transaction_type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending',
    
    -- Amounts
    gross_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL, -- Amount creator receives
    
    -- References
    subscription_id UUID REFERENCES subscriptions(id),
    post_id UUID REFERENCES posts(id),
    message_id UUID REFERENCES messages(id),
    
    -- Payment processor
    external_transaction_id VARCHAR(255), -- CCBill transaction ID
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Creator payouts
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES profiles(id),
    
    amount DECIMAL(12,2) NOT NULL,
    status payout_status DEFAULT 'pending',
    
    -- Period this payout covers
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Payment details
    payout_method VARCHAR(50), -- 'bank_transfer', 'paypal', etc.
    external_payout_id VARCHAR(255),
    
    processed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISCOVERY & ENGAGEMENT
-- ============================================

-- User follows (separate from subscriptions - free follow)
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id)
);

-- Saved/bookmarked posts
CREATE TABLE bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, post_id)
);

-- Creator categories/tags
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE creator_categories (
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (creator_id, category_id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL, -- 'new_subscriber', 'new_message', 'new_tip', etc.
    title TEXT NOT NULL,
    body TEXT,
    
    -- References
    actor_id UUID REFERENCES profiles(id), -- Who triggered the notification
    post_id UUID REFERENCES posts(id),
    
    is_read BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Profiles
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Creator profiles
CREATE INDEX idx_creator_profiles_user_id ON creator_profiles(user_id);

-- Subscriptions
CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Posts
CREATE INDEX idx_posts_creator ON posts(creator_id);
CREATE INDEX idx_posts_published ON posts(is_published, published_at DESC);
CREATE INDEX idx_posts_type ON posts(post_type);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_conversations_participants ON conversations(participant_1, participant_2);

-- Transactions
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_creator ON transactions(creator_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);

-- AI Chat
CREATE INDEX idx_ai_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX idx_ai_sessions_creator ON ai_chat_sessions(creator_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, own write
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Posts: Complex visibility based on subscription
CREATE POLICY "Free posts are viewable by everyone" ON posts
    FOR SELECT USING (
        post_type = 'free' 
        OR creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM subscriptions 
            WHERE subscriber_id = auth.uid() 
            AND creator_id = posts.creator_id 
            AND status = 'active'
        )
    );

CREATE POLICY "Creators can manage own posts" ON posts
    FOR ALL USING (creator_id = auth.uid());

-- Messages: Only participants can view
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
        )
    );

-- Notifications: Only own
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        NEW.email
    );
    
    -- Also create credit balance
    INSERT INTO credit_balances (user_id, balance)
    VALUES (NEW.id, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update subscriber count on subscription change
CREATE OR REPLACE FUNCTION update_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE creator_profiles 
        SET subscriber_count = subscriber_count + 1 
        WHERE user_id = NEW.creator_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE creator_profiles 
            SET subscriber_count = subscriber_count - 1 
            WHERE user_id = NEW.creator_id;
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE creator_profiles 
            SET subscriber_count = subscriber_count + 1 
            WHERE user_id = NEW.creator_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
        UPDATE creator_profiles 
        SET subscriber_count = subscriber_count - 1 
        WHERE user_id = OLD.creator_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriber_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_subscriber_count();

-- ============================================
-- SEED DATA (Categories)
-- ============================================

INSERT INTO categories (name, slug, description, sort_order) VALUES
    ('Girlfriend Experience', 'gfe', 'Romantic and intimate AI companions', 1),
    ('Fantasy', 'fantasy', 'Fantasy and roleplay characters', 2),
    ('Anime', 'anime', 'Anime-style AI models', 3),
    ('Realistic', 'realistic', 'Photorealistic AI models', 4),
    ('Alternative', 'alternative', 'Alternative and unique styles', 5),
    ('Male', 'male', 'Male AI models', 6),
    ('Couples', 'couples', 'AI couples and group content', 7),
    ('LGBTQ+', 'lgbtq', 'LGBTQ+ friendly content', 8);

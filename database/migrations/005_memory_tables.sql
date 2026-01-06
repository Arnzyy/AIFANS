-- ============================================
-- MEMORY SYSTEM TABLES
-- Safe fact storage for personalized AI chat
-- ============================================

-- User memory (per subscriber-creator pair)
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- User preferences
    preferred_name VARCHAR(50),
    interests TEXT[] DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    running_jokes TEXT[] DEFAULT '{}',
    neutral_topics TEXT[] DEFAULT '{}',

    -- Stats
    message_count INTEGER DEFAULT 0,
    last_interaction TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(subscriber_id, creator_id)
);

-- Conversation summaries (neutral language only)
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    summary TEXT,
    recent_topics TEXT[] DEFAULT '{}',

    last_updated TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(subscriber_id, creator_id)
);

-- Memory settings (user consent and controls)
CREATE TABLE IF NOT EXISTS memory_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    memory_enabled BOOLEAN DEFAULT TRUE,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_memory_subscriber ON user_memory(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_creator ON user_memory(creator_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_pair ON user_memory(subscriber_id, creator_id);

CREATE INDEX IF NOT EXISTS idx_conv_summaries_subscriber ON conversation_summaries(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_conv_summaries_creator ON conversation_summaries(creator_id);

CREATE INDEX IF NOT EXISTS idx_memory_settings_user ON memory_settings(user_id);

-- RLS Policies
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_settings ENABLE ROW LEVEL SECURITY;

-- Users can read their own memory
CREATE POLICY "Users can view own memory" ON user_memory
    FOR SELECT USING (subscriber_id = auth.uid());

-- Service role can insert/update memory
CREATE POLICY "Service can manage memory" ON user_memory
    FOR ALL USING (true);

-- Users can view their own summaries
CREATE POLICY "Users can view own summaries" ON conversation_summaries
    FOR SELECT USING (subscriber_id = auth.uid());

-- Service role can manage summaries
CREATE POLICY "Service can manage summaries" ON conversation_summaries
    FOR ALL USING (true);

-- Users can manage their own memory settings
CREATE POLICY "Users can manage own memory settings" ON memory_settings
    FOR ALL USING (user_id = auth.uid());

-- Update trigger for user_memory
CREATE TRIGGER update_user_memory_updated_at BEFORE UPDATE ON user_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update trigger for memory_settings
CREATE TRIGGER update_memory_settings_updated_at BEFORE UPDATE ON memory_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

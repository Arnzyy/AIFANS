-- ============================================
-- VOICE REALTIME SYSTEM
-- Complete schema for real-time voice chat
-- ============================================

-- ===========================================
-- VOICE LIBRARY
-- Available TTS voices from ElevenLabs
-- ===========================================

CREATE TABLE IF NOT EXISTS voice_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'elevenlabs' CHECK (provider IN ('elevenlabs', 'openai', 'playht')),
    provider_voice_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    gender TEXT CHECK (gender IN ('female', 'male', 'neutral')),
    age_range TEXT CHECK (age_range IN ('young', 'middle', 'mature')),
    accent TEXT DEFAULT 'neutral',
    style TEXT DEFAULT 'conversational',
    preview_url TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_voice_id)
);

-- Seed with placeholder voices (replace provider_voice_id with real ElevenLabs IDs)
INSERT INTO voice_library (provider, provider_voice_id, name, description, gender, age_range, accent, style) VALUES
    ('elevenlabs', 'REPLACE_WITH_REAL_ID_1', 'Soft & Sultry', 'Warm, breathy female voice with intimate tone', 'female', 'young', 'american', 'conversational'),
    ('elevenlabs', 'REPLACE_WITH_REAL_ID_2', 'Playful Brit', 'Energetic British female, flirty and fun', 'female', 'young', 'british', 'conversational'),
    ('elevenlabs', 'REPLACE_WITH_REAL_ID_3', 'Confident & Bold', 'Strong, assertive female voice', 'female', 'middle', 'american', 'conversational'),
    ('elevenlabs', 'REPLACE_WITH_REAL_ID_4', 'Sweet & Innocent', 'Gentle, higher-pitched feminine voice', 'female', 'young', 'neutral', 'conversational'),
    ('elevenlabs', 'REPLACE_WITH_REAL_ID_5', 'Husky Night Owl', 'Deep, raspy female voice for late-night vibe', 'female', 'middle', 'american', 'conversational'),
    ('elevenlabs', 'REPLACE_WITH_REAL_ID_6', 'Aussie Charm', 'Bright Australian female accent', 'female', 'young', 'australian', 'conversational'),
    ('elevenlabs', 'REPLACE_WITH_REAL_ID_7', 'Eastern European', 'Slight Eastern European accent, mysterious', 'female', 'young', 'european', 'conversational'),
    ('elevenlabs', 'REPLACE_WITH_REAL_ID_8', 'Girl Next Door', 'Casual, relatable American female', 'female', 'young', 'american', 'conversational')
ON CONFLICT (provider, provider_voice_id) DO NOTHING;

-- ===========================================
-- MODEL VOICE SETTINGS
-- Per-personality voice configuration
-- ===========================================

CREATE TABLE IF NOT EXISTS model_voice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    personality_id UUID NOT NULL REFERENCES ai_personalities(id) ON DELETE CASCADE,

    -- Voice selection
    voice_id UUID REFERENCES voice_library(id),
    custom_voice_id TEXT,  -- For cloned voices not in library

    -- Voice style controls (ElevenLabs parameters)
    stability NUMERIC(3,2) DEFAULT 0.5 CHECK (stability >= 0 AND stability <= 1),
    similarity_boost NUMERIC(3,2) DEFAULT 0.75 CHECK (similarity_boost >= 0 AND similarity_boost <= 1),
    style_exaggeration NUMERIC(3,2) DEFAULT 0.0 CHECK (style_exaggeration >= 0 AND style_exaggeration <= 1),
    speed NUMERIC(3,2) DEFAULT 1.0 CHECK (speed >= 0.5 AND speed <= 2.0),

    -- Feature toggles
    voice_enabled BOOLEAN DEFAULT FALSE,
    realtime_enabled BOOLEAN DEFAULT FALSE,

    -- Realtime-specific settings (can use different voice for realtime)
    realtime_voice_id TEXT,
    realtime_stability NUMERIC(3,2) DEFAULT 0.5,
    realtime_similarity NUMERIC(3,2) DEFAULT 0.75,
    realtime_speed NUMERIC(3,2) DEFAULT 1.0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(creator_id, personality_id)
);

-- ===========================================
-- VOICE SESSIONS
-- Tracks each live voice call
-- ===========================================

CREATE TABLE IF NOT EXISTS voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    personality_id UUID NOT NULL REFERENCES ai_personalities(id) ON DELETE CASCADE,

    -- Session state
    status TEXT NOT NULL DEFAULT 'connecting' CHECK (status IN ('connecting', 'active', 'paused', 'ended', 'failed')),
    mode TEXT NOT NULL DEFAULT 'call' CHECK (mode IN ('call', 'inline')),

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,

    -- Usage metrics
    stt_seconds NUMERIC(10,2) DEFAULT 0,
    tts_characters INTEGER DEFAULT 0,
    llm_input_tokens INTEGER DEFAULT 0,
    llm_output_tokens INTEGER DEFAULT 0,
    estimated_cost_cents INTEGER DEFAULT 0,

    -- Performance metrics
    avg_latency_ms INTEGER,
    barge_in_count INTEGER DEFAULT 0,

    -- End state
    ended_reason TEXT,
    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- VOICE SESSION MESSAGES
-- Transcript of the voice conversation
-- ===========================================

CREATE TABLE IF NOT EXISTS voice_session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,

    -- Timing
    timestamp_ms INTEGER NOT NULL,
    duration_ms INTEGER,

    -- Quality metrics
    stt_confidence NUMERIC(3,2),
    latency_ms INTEGER,
    was_interrupted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================
-- VOICE USAGE LIMITS
-- Per-user monthly minute tracking
-- ===========================================

CREATE TABLE IF NOT EXISTS voice_usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Billing period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Usage
    minutes_used NUMERIC(10,2) DEFAULT 0,
    minutes_limit INTEGER NOT NULL DEFAULT 60,

    -- Alerts sent
    alert_75_sent BOOLEAN DEFAULT FALSE,
    alert_90_sent BOOLEAN DEFAULT FALSE,
    limit_reached_sent BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(subscriber_id, period_start)
);

-- ===========================================
-- FEATURE FLAGS FOR VOICE
-- ===========================================

INSERT INTO feature_flags (flag_name, is_enabled, rollout_percentage, description) VALUES
    ('VOICE_REALTIME_ENABLED', TRUE, 100, 'Master switch for real-time voice feature'),
    ('VOICE_BARGE_IN_ENABLED', TRUE, 100, 'Allow users to interrupt AI mid-speech'),
    ('VOICE_MAX_SESSION_MINUTES', TRUE, 100, 'Maximum single session duration (value: 30 minutes)'),
    ('VOICE_MONTHLY_LIMIT_MINUTES', TRUE, 100, 'Monthly voice minutes per premium subscriber (value: 60 minutes)')
ON CONFLICT (flag_name) DO NOTHING;

-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_voice_library_active ON voice_library(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_voice_library_provider ON voice_library(provider);

CREATE INDEX IF NOT EXISTS idx_model_voice_settings_creator ON model_voice_settings(creator_id);
CREATE INDEX IF NOT EXISTS idx_model_voice_settings_personality ON model_voice_settings(personality_id);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_subscriber ON voice_sessions(subscriber_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_creator ON voice_sessions(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON voice_sessions(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_voice_messages_session ON voice_session_messages(session_id, timestamp_ms);

CREATE INDEX IF NOT EXISTS idx_voice_usage_subscriber ON voice_usage_limits(subscriber_id, period_start DESC);

-- ===========================================
-- RLS POLICIES
-- ===========================================

-- Voice Library: Read-only for authenticated users
ALTER TABLE voice_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active voices" ON voice_library
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = TRUE);

CREATE POLICY "Service role can manage voice library" ON voice_library
    FOR ALL USING (auth.role() = 'service_role');

-- Model Voice Settings: Creators manage their own, users can read for subscribed creators
ALTER TABLE model_voice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own voice settings" ON model_voice_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM creators
            WHERE creators.id = model_voice_settings.creator_id
            AND creators.user_id = auth.uid()
        )
    );

CREATE POLICY "Subscribers can view voice settings for subscribed creators" ON model_voice_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subscriptions
            WHERE subscriptions.subscriber_id = auth.uid()
            AND subscriptions.creator_id = model_voice_settings.creator_id
            AND subscriptions.status IN ('active', 'trialing')
        )
    );

CREATE POLICY "Service role can manage voice settings" ON model_voice_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Voice Sessions: Users can view/create their own
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscribers can view own sessions" ON voice_sessions
    FOR SELECT USING (auth.uid() = subscriber_id);

CREATE POLICY "Subscribers can create sessions" ON voice_sessions
    FOR INSERT WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Subscribers can update own sessions" ON voice_sessions
    FOR UPDATE USING (auth.uid() = subscriber_id);

CREATE POLICY "Creators can view sessions for their personalities" ON voice_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM creators
            WHERE creators.id = voice_sessions.creator_id
            AND creators.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage sessions" ON voice_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Voice Session Messages: Same access as sessions
ALTER TABLE voice_session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session messages" ON voice_session_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM voice_sessions
            WHERE voice_sessions.id = voice_session_messages.session_id
            AND voice_sessions.subscriber_id = auth.uid()
        )
    );

CREATE POLICY "Users can create session messages" ON voice_session_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM voice_sessions
            WHERE voice_sessions.id = voice_session_messages.session_id
            AND voice_sessions.subscriber_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage session messages" ON voice_session_messages
    FOR ALL USING (auth.role() = 'service_role');

-- Voice Usage Limits: Users can view their own
ALTER TABLE voice_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON voice_usage_limits
    FOR SELECT USING (auth.uid() = subscriber_id);

CREATE POLICY "Service role can manage usage" ON voice_usage_limits
    FOR ALL USING (auth.role() = 'service_role');

-- ===========================================
-- UPDATE TRIGGERS
-- ===========================================

CREATE TRIGGER update_voice_library_updated_at
    BEFORE UPDATE ON voice_library
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_model_voice_settings_updated_at
    BEFORE UPDATE ON model_voice_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_voice_sessions_updated_at
    BEFORE UPDATE ON voice_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_voice_usage_limits_updated_at
    BEFORE UPDATE ON voice_usage_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Get or create voice usage for current period
CREATE OR REPLACE FUNCTION get_or_create_voice_usage(
    p_subscriber_id UUID,
    p_minutes_limit INTEGER DEFAULT 60
)
RETURNS voice_usage_limits AS $$
DECLARE
    v_period_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
    v_period_end DATE := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;
    v_usage voice_usage_limits;
BEGIN
    -- Try to get existing record
    SELECT * INTO v_usage
    FROM voice_usage_limits
    WHERE subscriber_id = p_subscriber_id
    AND period_start = v_period_start;

    -- Create if doesn't exist
    IF NOT FOUND THEN
        INSERT INTO voice_usage_limits (subscriber_id, period_start, period_end, minutes_limit)
        VALUES (p_subscriber_id, v_period_start, v_period_end, p_minutes_limit)
        RETURNING * INTO v_usage;
    END IF;

    RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment voice usage minutes
CREATE OR REPLACE FUNCTION increment_voice_usage(
    p_subscriber_id UUID,
    p_minutes NUMERIC
)
RETURNS voice_usage_limits AS $$
DECLARE
    v_usage voice_usage_limits;
BEGIN
    -- Get or create usage record
    v_usage := get_or_create_voice_usage(p_subscriber_id);

    -- Update usage
    UPDATE voice_usage_limits
    SET minutes_used = minutes_used + p_minutes,
        updated_at = NOW()
    WHERE id = v_usage.id
    RETURNING * INTO v_usage;

    RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON TABLE voice_library IS 'Available TTS voices from ElevenLabs and other providers';
COMMENT ON TABLE model_voice_settings IS 'Per-personality voice configuration for creators';
COMMENT ON TABLE voice_sessions IS 'Tracks each real-time voice call session';
COMMENT ON TABLE voice_session_messages IS 'Transcript of voice conversation messages';
COMMENT ON TABLE voice_usage_limits IS 'Monthly voice minute tracking for billing';

COMMENT ON COLUMN voice_library.provider_voice_id IS 'The voice ID from the TTS provider (e.g., ElevenLabs voice ID)';
COMMENT ON COLUMN model_voice_settings.stability IS 'ElevenLabs stability parameter (0-1). Higher = more consistent';
COMMENT ON COLUMN model_voice_settings.similarity_boost IS 'ElevenLabs similarity boost (0-1). Higher = closer to original';
COMMENT ON COLUMN voice_sessions.mode IS 'call = full-screen phone UI, inline = mic button in chat';
COMMENT ON COLUMN voice_sessions.barge_in_count IS 'Number of times user interrupted AI during session';

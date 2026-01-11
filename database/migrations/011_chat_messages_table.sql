-- ============================================
-- CHAT MESSAGES TABLE
-- Stores conversation messages between users and AI models
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Participants
    creator_id UUID NOT NULL,  -- The model/creator ID
    subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Message content
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_subscriber ON chat_messages(subscriber_id);

-- RLS Policies
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages
CREATE POLICY "Users can view own chat messages" ON chat_messages
    FOR SELECT USING (subscriber_id = auth.uid());

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages" ON chat_messages
    FOR INSERT WITH CHECK (subscriber_id = auth.uid());

-- Service role can manage all messages (for AI responses)
CREATE POLICY "Service can manage chat messages" ON chat_messages
    FOR ALL USING (true);

-- ===========================================
-- Migration 009: Add subscription types
-- Separates content, chat, and bundle subscriptions
-- ===========================================

-- Add subscription_type column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) DEFAULT 'content';

-- Add check constraint for valid types
ALTER TABLE subscriptions
ADD CONSTRAINT valid_subscription_type
CHECK (subscription_type IN ('content', 'chat', 'bundle'));

-- Remove the old unique constraint (subscriber_id, creator_id)
-- and add new one that includes subscription_type
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_subscriber_id_creator_id_key;

-- Create new unique constraint
-- Note: bundle is unique per creator, but content and chat can coexist
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_unique_type_idx
ON subscriptions (subscriber_id, creator_id, subscription_type)
WHERE status = 'active';

-- Add chat_subscription_price to creator_profiles if not exists
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS chat_subscription_price DECIMAL(10,2) DEFAULT 9.99;

-- Index for faster subscription type queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_type
ON subscriptions (creator_id, subscription_type, status);

-- Comment for documentation
COMMENT ON COLUMN subscriptions.subscription_type IS 'Type of subscription: content (posts/media), chat (AI chat), or bundle (both)';
COMMENT ON COLUMN creator_profiles.chat_subscription_price IS 'Monthly price for chat-only subscription in GBP';

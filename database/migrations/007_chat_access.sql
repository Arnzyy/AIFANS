-- ===========================================
-- Migration: 007_chat_access.sql
-- Chat Access Control & Tokenized Sessions
-- ===========================================

-- 1. Add message allowance to subscription tiers
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS
  monthly_message_allowance INTEGER DEFAULT 500;

-- 2. Add message tracking to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  messages_used_this_period INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  period_messages_reset_at TIMESTAMPTZ;

-- 3. Create chat sessions table (for paid non-subscriber sessions)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  creator_id UUID NOT NULL,
  model_id UUID, -- optional: specific model

  -- Session details
  messages_purchased INTEGER NOT NULL,
  messages_remaining INTEGER NOT NULL,
  cost_tokens INTEGER NOT NULL,

  -- State
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exhausted')),

  -- Tracking
  ledger_entry_id UUID REFERENCES token_ledger(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional time-based expiry
  last_message_at TIMESTAMPTZ,

  -- Constraint: One active session per user-creator pair
  CONSTRAINT unique_active_session UNIQUE (user_id, creator_id) WHERE (status = 'active')
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_creator
  ON chat_sessions(user_id, creator_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status
  ON chat_sessions(status) WHERE status = 'active';

-- 4. Add chat session reason to token ledger enum (if using enum type)
-- Note: This depends on how token_ledger_reason is defined
-- If it's a CHECK constraint, update it; if enum, add value
DO $$
BEGIN
  -- Try adding to enum if it exists
  ALTER TYPE token_ledger_reason ADD VALUE IF NOT EXISTS 'CHAT_SESSION';
EXCEPTION
  WHEN undefined_object THEN
    -- Enum doesn't exist, that's fine - handled by CHECK constraint
    NULL;
END $$;

-- 5. Create opening messages table
CREATE TABLE IF NOT EXISTS opening_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  model_id UUID, -- Optional: model-specific opening message
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('unsubscribed', 'subscribed', 'returning')),
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opening_messages_lookup
  ON opening_messages(creator_id, model_id, message_type, is_active);

-- 6. RLS policies for chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own sessions (for message tracking)
CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- System/service role can insert (via RPC function)
CREATE POLICY "Service can insert chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (true);

-- RLS for opening_messages
ALTER TABLE opening_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can read active opening messages
CREATE POLICY "Anyone can read active opening messages" ON opening_messages
  FOR SELECT USING (is_active = true);

-- Creators can manage their own opening messages
CREATE POLICY "Creators can manage own opening messages" ON opening_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM creators c
      WHERE c.id = opening_messages.creator_id
      AND c.user_id = auth.uid()
    )
  );

-- 7. Function to purchase chat session (atomic transaction)
CREATE OR REPLACE FUNCTION purchase_chat_session(
  p_user_id UUID,
  p_creator_id UUID,
  p_model_id UUID,
  p_messages INTEGER,
  p_cost_tokens INTEGER
) RETURNS TABLE(
  success BOOLEAN,
  session_id UUID,
  new_balance INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_session_id UUID;
  v_ledger_id UUID;
BEGIN
  -- Lock wallet row for atomic update
  SELECT id, balance_tokens INTO v_wallet_id, v_current_balance
  FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;

  -- Check balance
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Wallet not found'::TEXT;
    RETURN;
  END IF;

  IF v_current_balance < p_cost_tokens THEN
    RETURN QUERY SELECT false, NULL::UUID, v_current_balance, 'Insufficient token balance'::TEXT;
    RETURN;
  END IF;

  -- Deduct tokens
  v_new_balance := v_current_balance - p_cost_tokens;
  UPDATE token_wallets SET
    balance_tokens = v_new_balance,
    lifetime_spent = lifetime_spent + p_cost_tokens,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- Create ledger entry
  INSERT INTO token_ledger (
    user_id, type, reason, amount_tokens, balance_after,
    related_creator_id, description
  )
  VALUES (
    p_user_id, 'DEBIT', 'CHAT_SESSION', p_cost_tokens, v_new_balance,
    p_creator_id, p_messages || ' message chat session'
  )
  RETURNING id INTO v_ledger_id;

  -- Expire any existing active session with this creator
  UPDATE chat_sessions SET status = 'expired'
  WHERE user_id = p_user_id
    AND creator_id = p_creator_id
    AND status = 'active';

  -- Create new session
  INSERT INTO chat_sessions (
    user_id, creator_id, model_id,
    messages_purchased, messages_remaining,
    cost_tokens, ledger_entry_id
  )
  VALUES (
    p_user_id, p_creator_id, p_model_id,
    p_messages, p_messages,
    p_cost_tokens, v_ledger_id
  )
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT true, v_session_id, v_new_balance, NULL::TEXT;
END;
$$;

-- 8. Function to decrement message from session
CREATE OR REPLACE FUNCTION decrement_chat_session_message(
  p_user_id UUID,
  p_creator_id UUID
) RETURNS TABLE(
  success BOOLEAN,
  messages_remaining INTEGER,
  session_exhausted BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_remaining INTEGER;
BEGIN
  -- Lock and get active session
  SELECT id, chat_sessions.messages_remaining INTO v_session_id, v_remaining
  FROM chat_sessions
  WHERE user_id = p_user_id
    AND creator_id = p_creator_id
    AND status = 'active'
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, 0, true, 'No active session'::TEXT;
    RETURN;
  END IF;

  IF v_remaining <= 0 THEN
    -- Mark session as exhausted
    UPDATE chat_sessions SET status = 'exhausted' WHERE id = v_session_id;
    RETURN QUERY SELECT false, 0, true, 'Session messages exhausted'::TEXT;
    RETURN;
  END IF;

  -- Decrement message count
  v_remaining := v_remaining - 1;
  UPDATE chat_sessions SET
    messages_remaining = v_remaining,
    last_message_at = NOW()
  WHERE id = v_session_id;

  -- Mark as exhausted if this was the last message
  IF v_remaining = 0 THEN
    UPDATE chat_sessions SET status = 'exhausted' WHERE id = v_session_id;
  END IF;

  RETURN QUERY SELECT true, v_remaining, (v_remaining = 0), NULL::TEXT;
END;
$$;

-- 9. Function to extend a session with more messages
CREATE OR REPLACE FUNCTION extend_chat_session(
  p_user_id UUID,
  p_creator_id UUID,
  p_messages INTEGER,
  p_cost_tokens INTEGER
) RETURNS TABLE(
  success BOOLEAN,
  new_remaining INTEGER,
  new_balance INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_session_id UUID;
  v_current_remaining INTEGER;
BEGIN
  -- Lock wallet
  SELECT id, balance_tokens INTO v_wallet_id, v_current_balance
  FROM token_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < p_cost_tokens THEN
    RETURN QUERY SELECT false, 0, COALESCE(v_current_balance, 0), 'Insufficient token balance'::TEXT;
    RETURN;
  END IF;

  -- Find active or exhausted session (can extend both)
  SELECT id, messages_remaining INTO v_session_id, v_current_remaining
  FROM chat_sessions
  WHERE user_id = p_user_id
    AND creator_id = p_creator_id
    AND status IN ('active', 'exhausted')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, 0, v_current_balance, 'No session to extend'::TEXT;
    RETURN;
  END IF;

  -- Deduct tokens
  v_new_balance := v_current_balance - p_cost_tokens;
  UPDATE token_wallets SET
    balance_tokens = v_new_balance,
    lifetime_spent = lifetime_spent + p_cost_tokens,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- Create ledger entry
  INSERT INTO token_ledger (
    user_id, type, reason, amount_tokens, balance_after,
    related_creator_id, description
  )
  VALUES (
    p_user_id, 'DEBIT', 'EXTRA_MESSAGE', p_cost_tokens, v_new_balance,
    p_creator_id, p_messages || ' additional messages'
  );

  -- Update session
  UPDATE chat_sessions SET
    messages_remaining = COALESCE(messages_remaining, 0) + p_messages,
    messages_purchased = messages_purchased + p_messages,
    status = 'active'
  WHERE id = v_session_id;

  RETURN QUERY SELECT true, (v_current_remaining + p_messages), v_new_balance, NULL::TEXT;
END;
$$;

-- 10. Function to decrement subscriber message allowance
CREATE OR REPLACE FUNCTION decrement_subscription_message(
  p_user_id UUID,
  p_creator_id UUID
) RETURNS TABLE(
  success BOOLEAN,
  messages_remaining INTEGER,
  needs_reset BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
  v_messages_used INTEGER;
  v_allowance INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_current_period_start TIMESTAMPTZ;
BEGIN
  -- Get active subscription with tier info
  SELECT s.id, s.messages_used_this_period, t.monthly_message_allowance,
         s.period_messages_reset_at, s.current_period_start
  INTO v_sub_id, v_messages_used, v_allowance, v_reset_at, v_current_period_start
  FROM subscriptions s
  JOIN subscription_tiers t ON t.id = s.tier_id
  WHERE s.subscriber_id = p_user_id
    AND s.creator_id = p_creator_id
    AND s.status = 'active'
  FOR UPDATE;

  IF v_sub_id IS NULL THEN
    RETURN QUERY SELECT false, 0, false, 'No active subscription'::TEXT;
    RETURN;
  END IF;

  -- Check if we need to reset (new billing period)
  IF v_reset_at IS NULL OR v_reset_at < v_current_period_start THEN
    v_messages_used := 0;
    v_reset_at := v_current_period_start;
  END IF;

  -- Check allowance (null means unlimited)
  IF v_allowance IS NOT NULL AND v_messages_used >= v_allowance THEN
    RETURN QUERY SELECT false, (v_allowance - v_messages_used), false, 'Message allowance exceeded'::TEXT;
    RETURN;
  END IF;

  -- Increment messages used
  v_messages_used := v_messages_used + 1;
  UPDATE subscriptions SET
    messages_used_this_period = v_messages_used,
    period_messages_reset_at = v_reset_at
  WHERE id = v_sub_id;

  RETURN QUERY SELECT true,
    CASE WHEN v_allowance IS NULL THEN NULL::INTEGER ELSE (v_allowance - v_messages_used) END,
    false,
    NULL::TEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION purchase_chat_session TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_chat_session_message TO authenticated;
GRANT EXECUTE ON FUNCTION extend_chat_session TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_subscription_message TO authenticated;

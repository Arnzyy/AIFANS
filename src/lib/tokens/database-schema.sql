-- ===========================================
-- STRIPE TOKEN WALLET SYSTEM
-- ADDITIVE - DO NOT MODIFY EXISTING SUBSCRIPTION TABLES
-- ===========================================

-- =====================
-- 1. TOKEN PACKS CONFIG
-- Define purchasable token bundles
-- =====================

CREATE TABLE IF NOT EXISTS token_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,          -- e.g., 'pack_500', 'pack_1200', 'pack_2600'
  name VARCHAR(100) NOT NULL,                -- Display name: "500 Tokens"
  description VARCHAR(255),                  -- "Best value!" etc.
  price_minor INTEGER NOT NULL,              -- Price in pence (499, 999, 1999)
  currency VARCHAR(3) DEFAULT 'GBP',
  tokens INTEGER NOT NULL,                   -- Tokens awarded (500, 1200, 2600)
  stripe_price_id VARCHAR(100),              -- Stripe Price ID once created
  is_active BOOLEAN DEFAULT true,
  is_best_value BOOLEAN DEFAULT false,       -- Highlight in UI
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default packs
INSERT INTO token_packs (sku, name, description, price_minor, currency, tokens, is_best_value, sort_order) VALUES
  ('pack_500', '500 Tokens', '~20 extra messages', 499, 'GBP', 500, false, 1),
  ('pack_1200', '1,200 Tokens', 'Best value!', 999, 'GBP', 1200, true, 2),
  ('pack_2600', '2,600 Tokens', 'Power user pack', 1999, 'GBP', 2600, false, 3)
ON CONFLICT (sku) DO NOTHING;

-- =====================
-- 2. USER TOKEN WALLET
-- Cached balance (validated against ledger)
-- =====================

CREATE TABLE IF NOT EXISTS token_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance_tokens INTEGER NOT NULL DEFAULT 0 CHECK (balance_tokens >= 0),
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallets_user ON token_wallets(user_id);

-- =====================
-- 3. TOKEN LEDGER
-- Authoritative record of all token movements
-- =====================

CREATE TYPE token_ledger_type AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE token_ledger_reason AS ENUM (
  'PACK_PURCHASE',
  'EXTRA_MESSAGE',
  'TIP',
  'REFUND',
  'ADJUSTMENT',
  'PROMO_CREDIT',
  'PPV_UNLOCK'  -- Future use
);

CREATE TABLE IF NOT EXISTS token_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type token_ledger_type NOT NULL,
  reason token_ledger_reason NOT NULL,
  amount_tokens INTEGER NOT NULL CHECK (amount_tokens > 0),
  balance_after INTEGER NOT NULL,            -- Snapshot for audit trail
  
  -- Related entities (nullable)
  related_creator_id UUID REFERENCES auth.users(id),
  related_thread_id UUID,
  related_payment_id UUID,
  related_tip_id UUID,
  
  -- Metadata for debugging/support
  metadata JSONB DEFAULT '{}',
  description VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ledger_user ON token_ledger(user_id);
CREATE INDEX idx_ledger_user_created ON token_ledger(user_id, created_at DESC);
CREATE INDEX idx_ledger_reason ON token_ledger(reason);
CREATE INDEX idx_ledger_creator ON token_ledger(related_creator_id) WHERE related_creator_id IS NOT NULL;

-- =====================
-- 4. TOKEN PACK PURCHASES
-- Stripe checkout tracking
-- =====================

CREATE TYPE purchase_status AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

CREATE TABLE IF NOT EXISTS token_pack_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Stripe identifiers
  stripe_checkout_session_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  
  -- Purchase details
  pack_sku VARCHAR(50) NOT NULL REFERENCES token_packs(sku),
  tokens_awarded INTEGER NOT NULL,
  
  -- Payment details
  currency VARCHAR(3) DEFAULT 'GBP',
  amount_paid_minor INTEGER NOT NULL,        -- Pence
  
  -- Status
  status purchase_status DEFAULT 'PENDING',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message VARCHAR(500),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_user ON token_pack_purchases(user_id);
CREATE INDEX idx_purchases_checkout ON token_pack_purchases(stripe_checkout_session_id);
CREATE INDEX idx_purchases_status ON token_pack_purchases(status);

-- =====================
-- 5. TIPS TABLE
-- Track tips for analytics + creator payouts
-- =====================

CREATE TYPE tip_status AS ENUM ('SUCCEEDED', 'REFUNDED');

CREATE TABLE IF NOT EXISTS tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),        -- Tipper
  creator_id UUID NOT NULL REFERENCES auth.users(id),     -- Recipient
  thread_id UUID,                                          -- Chat thread (optional)
  chat_mode VARCHAR(10) DEFAULT 'nsfw',                   -- 'nsfw' or 'sfw'
  
  -- Amounts
  amount_tokens INTEGER NOT NULL CHECK (amount_tokens > 0),
  amount_gbp_minor INTEGER NOT NULL,                       -- £ equivalent in pence
  
  -- Split calculation (stored for audit)
  platform_fee_pct INTEGER NOT NULL DEFAULT 30,
  platform_fee_tokens INTEGER NOT NULL,
  creator_share_tokens INTEGER NOT NULL,
  
  status tip_status DEFAULT 'SUCCEEDED',
  
  -- Ledger reference
  ledger_entry_id UUID REFERENCES token_ledger(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tips_user ON tips(user_id);
CREATE INDEX idx_tips_creator ON tips(creator_id);
CREATE INDEX idx_tips_creator_month ON tips(creator_id, created_at);

-- =====================
-- 6. PLATFORM CONFIG
-- Configurable settings
-- =====================

CREATE TABLE IF NOT EXISTS platform_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO platform_config (key, value, description) VALUES
  ('extra_message_cost_tokens', '100', 'Token cost per extra message beyond included allowance'),
  ('platform_fee_tips_pct', '30', 'Platform fee percentage on tips (creator gets 100 - this)'),
  ('tokens_per_gbp_100', '250', 'Tokens per £1 (so 100 tokens ≈ £0.40)'),
  ('tip_presets_tokens', '[250, 500, 1250]', 'Default tip preset amounts in tokens [£1, £2, £5 equiv]'),
  ('min_tip_tokens', '50', 'Minimum tip amount in tokens'),
  ('max_tip_tokens', '25000', 'Maximum tip amount in tokens')
ON CONFLICT (key) DO NOTHING;

-- =====================
-- 7. CREATOR PAYOUT LEDGER
-- Track creator earnings from tips
-- =====================

CREATE TYPE payout_type AS ENUM ('TIP_SHARE', 'MESSAGE_SHARE', 'PPV_SHARE', 'WITHDRAWAL', 'ADJUSTMENT');
CREATE TYPE payout_status AS ENUM ('PENDING', 'AVAILABLE', 'WITHDRAWN', 'CANCELLED');

CREATE TABLE IF NOT EXISTS creator_payout_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  type payout_type NOT NULL,
  
  -- Amounts (in tokens, convertible to GBP)
  amount_tokens INTEGER NOT NULL,
  amount_gbp_minor INTEGER NOT NULL,           -- £ equivalent in pence
  
  -- References
  related_tip_id UUID REFERENCES tips(id),
  related_user_id UUID REFERENCES auth.users(id),  -- Who paid
  
  status payout_status DEFAULT 'PENDING',
  description VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payout_creator ON creator_payout_ledger(creator_id);
CREATE INDEX idx_payout_status ON creator_payout_ledger(creator_id, status);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payout_ledger ENABLE ROW LEVEL SECURITY;

-- Users can only see their own wallet
CREATE POLICY "Users view own wallet"
  ON token_wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only see their own ledger
CREATE POLICY "Users view own ledger"
  ON token_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only see their own purchases
CREATE POLICY "Users view own purchases"
  ON token_pack_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see tips they sent or received (as creator)
CREATE POLICY "Users view own tips"
  ON tips FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = creator_id);

-- Creators can see their payout ledger
CREATE POLICY "Creators view own payouts"
  ON creator_payout_ledger FOR SELECT
  USING (auth.uid() = creator_id);

-- =====================
-- FUNCTIONS
-- =====================

-- Function to get or create wallet
CREATE OR REPLACE FUNCTION get_or_create_wallet(p_user_id UUID)
RETURNS token_wallets AS $$
DECLARE
  v_wallet token_wallets;
BEGIN
  SELECT * INTO v_wallet FROM token_wallets WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO token_wallets (user_id, balance_tokens)
    VALUES (p_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql;

-- ATOMIC spend_tokens function
CREATE OR REPLACE FUNCTION spend_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason token_ledger_reason,
  p_creator_id UUID DEFAULT NULL,
  p_thread_id UUID DEFAULT NULL,
  p_description VARCHAR(255) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, ledger_id UUID, error_message VARCHAR) AS $$
DECLARE
  v_wallet token_wallets;
  v_new_balance INTEGER;
  v_ledger_id UUID;
BEGIN
  -- Lock wallet row for update
  SELECT * INTO v_wallet 
  FROM token_wallets 
  WHERE user_id = p_user_id 
  FOR UPDATE;
  
  -- Create wallet if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO token_wallets (user_id, balance_tokens)
    VALUES (p_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  -- Check balance
  IF v_wallet.balance_tokens < p_amount THEN
    RETURN QUERY SELECT false, v_wallet.balance_tokens, NULL::UUID, 'Insufficient token balance'::VARCHAR;
    RETURN;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_wallet.balance_tokens - p_amount;
  
  -- Insert ledger entry
  INSERT INTO token_ledger (
    user_id, type, reason, amount_tokens, balance_after,
    related_creator_id, related_thread_id, description, metadata
  ) VALUES (
    p_user_id, 'DEBIT', p_reason, p_amount, v_new_balance,
    p_creator_id, p_thread_id, p_description, p_metadata
  )
  RETURNING id INTO v_ledger_id;
  
  -- Update wallet
  UPDATE token_wallets 
  SET 
    balance_tokens = v_new_balance,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT true, v_new_balance, v_ledger_id, NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Credit tokens function (for purchases)
CREATE OR REPLACE FUNCTION credit_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason token_ledger_reason,
  p_payment_id UUID DEFAULT NULL,
  p_description VARCHAR(255) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, ledger_id UUID) AS $$
DECLARE
  v_wallet token_wallets;
  v_new_balance INTEGER;
  v_ledger_id UUID;
BEGIN
  -- Lock wallet row for update
  SELECT * INTO v_wallet 
  FROM token_wallets 
  WHERE user_id = p_user_id 
  FOR UPDATE;
  
  -- Create wallet if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO token_wallets (user_id, balance_tokens, lifetime_purchased)
    VALUES (p_user_id, 0, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_wallet.balance_tokens + p_amount;
  
  -- Insert ledger entry
  INSERT INTO token_ledger (
    user_id, type, reason, amount_tokens, balance_after,
    related_payment_id, description, metadata
  ) VALUES (
    p_user_id, 'CREDIT', p_reason, p_amount, v_new_balance,
    p_payment_id, p_description, p_metadata
  )
  RETURNING id INTO v_ledger_id;
  
  -- Update wallet
  UPDATE token_wallets 
  SET 
    balance_tokens = v_new_balance,
    lifetime_purchased = lifetime_purchased + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT true, v_new_balance, v_ledger_id;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- TRIGGERS
-- =====================

CREATE TRIGGER token_wallets_updated
  BEFORE UPDATE ON token_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER token_purchases_updated
  BEFORE UPDATE ON token_pack_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER token_packs_updated
  BEFORE UPDATE ON token_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- 8. CHAT EVENTS TABLE
-- For tip acknowledgements and other events
-- =====================

CREATE TABLE IF NOT EXISTS chat_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,   -- 'TIP_RECEIVED', 'SUBSCRIPTION', etc.
  payload JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_events_thread ON chat_events(thread_id);
CREATE INDEX idx_chat_events_unprocessed ON chat_events(thread_id, processed) WHERE NOT processed;

-- =====================
-- SEND TIP FUNCTION (ATOMIC)
-- Complete tip transaction in one call
-- =====================

CREATE OR REPLACE FUNCTION send_tip(
  p_user_id UUID,
  p_creator_id UUID,
  p_amount_tokens INTEGER,
  p_thread_id UUID DEFAULT NULL,
  p_chat_mode VARCHAR(10) DEFAULT 'nsfw',
  p_platform_fee_pct INTEGER DEFAULT 30,
  p_platform_fee_tokens INTEGER DEFAULT NULL,
  p_creator_share_tokens INTEGER DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN, 
  tip_id UUID, 
  new_balance INTEGER, 
  error_message VARCHAR
) AS $$
DECLARE
  v_wallet token_wallets;
  v_new_balance INTEGER;
  v_ledger_id UUID;
  v_tip_id UUID;
  v_platform_fee INTEGER;
  v_creator_share INTEGER;
  v_amount_gbp_minor INTEGER;
BEGIN
  -- Calculate fee/share if not provided
  v_platform_fee := COALESCE(p_platform_fee_tokens, FLOOR((p_amount_tokens * p_platform_fee_pct) / 100));
  v_creator_share := COALESCE(p_creator_share_tokens, p_amount_tokens - v_platform_fee);
  v_amount_gbp_minor := ROUND((p_amount_tokens::DECIMAL / 250) * 100);
  
  -- Lock wallet row for update
  SELECT * INTO v_wallet 
  FROM token_wallets 
  WHERE user_id = p_user_id 
  FOR UPDATE;
  
  -- Create wallet if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO token_wallets (user_id, balance_tokens)
    VALUES (p_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  -- Check balance
  IF v_wallet.balance_tokens < p_amount_tokens THEN
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      NULL::UUID, 
      v_wallet.balance_tokens, 
      'Insufficient token balance'::VARCHAR;
    RETURN;
  END IF;
  
  -- Can't tip yourself
  IF p_user_id = p_creator_id THEN
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      NULL::UUID, 
      v_wallet.balance_tokens, 
      'Cannot tip yourself'::VARCHAR;
    RETURN;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_wallet.balance_tokens - p_amount_tokens;
  
  -- Insert ledger entry
  INSERT INTO token_ledger (
    user_id, type, reason, amount_tokens, balance_after,
    related_creator_id, related_thread_id, description
  ) VALUES (
    p_user_id, 'DEBIT', 'TIP', p_amount_tokens, v_new_balance,
    p_creator_id, p_thread_id, 'Tip sent'
  )
  RETURNING id INTO v_ledger_id;
  
  -- Update wallet
  UPDATE token_wallets 
  SET 
    balance_tokens = v_new_balance,
    lifetime_spent = lifetime_spent + p_amount_tokens,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Create tip record
  INSERT INTO tips (
    user_id, creator_id, thread_id, chat_mode,
    amount_tokens, amount_gbp_minor,
    platform_fee_pct, platform_fee_tokens, creator_share_tokens,
    status, ledger_entry_id
  ) VALUES (
    p_user_id, p_creator_id, p_thread_id, p_chat_mode,
    p_amount_tokens, v_amount_gbp_minor,
    p_platform_fee_pct, v_platform_fee, v_creator_share,
    'SUCCEEDED', v_ledger_id
  )
  RETURNING id INTO v_tip_id;
  
  -- Create payout ledger entry for creator
  INSERT INTO creator_payout_ledger (
    creator_id, type, amount_tokens, amount_gbp_minor,
    related_tip_id, related_user_id, status, description
  ) VALUES (
    p_creator_id, 'TIP_SHARE', v_creator_share, 
    ROUND((v_creator_share::DECIMAL / 250) * 100),
    v_tip_id, p_user_id, 'PENDING', 'Tip from subscriber'
  );
  
  -- Insert chat event for AI acknowledgement
  IF p_thread_id IS NOT NULL THEN
    INSERT INTO chat_events (thread_id, event_type, payload)
    VALUES (
      p_thread_id, 
      'TIP_RECEIVED', 
      jsonb_build_object(
        'amount_tokens', p_amount_tokens,
        'tip_id', v_tip_id,
        'from_user_id', p_user_id
      )
    );
  END IF;
  
  RETURN QUERY SELECT true::BOOLEAN, v_tip_id, v_new_balance, NULL::VARCHAR;
END;
$$ LANGUAGE plpgsql;

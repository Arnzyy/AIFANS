-- ===========================================
-- SETUP DEMO ACCOUNT: demo@joinlyra.com
-- Run this in Supabase SQL Editor
-- ===========================================

-- IMPORTANT IDs:
-- Demo user: f56af389-5e37-455e-920e-21de7359c2cd
-- Owner (billy@gmail.com): e5d5a13f-4978-4737-a941-adea3350c79b
-- Lyra model: 54bf804b-b9e4-4cc1-909c-fe042f043866

-- ===========================================
-- STEP 1: ENSURE DEMO USER HAS A PROFILE
-- ===========================================

-- Check if demo user profile exists
SELECT id, display_name FROM profiles WHERE id = 'f56af389-5e37-455e-920e-21de7359c2cd';

-- If no profile exists, create one
INSERT INTO profiles (id, username, display_name, email, created_at, updated_at)
VALUES (
  'f56af389-5e37-455e-920e-21de7359c2cd',
  'demo_user',
  'Demo User',
  'demo@joinlyra.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- STEP 2: ADD 50,000 TOKENS TO WALLET
-- ===========================================

-- Create wallet if doesn't exist, or update balance
-- Note: Column is 'balance_tokens' not 'balance'
INSERT INTO token_wallets (user_id, balance_tokens, created_at, updated_at)
VALUES (
  'f56af389-5e37-455e-920e-21de7359c2cd',
  50000,
  NOW(),
  NOW()
)
ON CONFLICT (user_id)
DO UPDATE SET
  balance_tokens = 50000,
  updated_at = NOW();

-- Log the token grant in ledger
INSERT INTO token_ledger (
  user_id,
  amount,
  balance_after,
  transaction_type,
  description,
  created_at
) VALUES (
  'f56af389-5e37-455e-920e-21de7359c2cd',
  50000,
  50000,
  'admin_grant',
  'Demo account setup - 50,000 tokens',
  NOW()
);

-- ===========================================
-- STEP 3: CREATE SUBSCRIPTION TO LYRA
-- ===========================================

-- This gives FULL access (bundle = content + chat)
-- creator_id must be a profile ID (the owner), not model ID
-- Owner is billy@gmail.com: e5d5a13f-4978-4737-a941-adea3350c79b

INSERT INTO subscriptions (
  subscriber_id,
  creator_id,
  subscription_type,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
)
VALUES (
  'f56af389-5e37-455e-920e-21de7359c2cd',  -- demo user
  'e5d5a13f-4978-4737-a941-adea3350c79b',  -- owner profile (billy@gmail.com)
  'bundle',                                  -- full access (content + chat)
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
)
ON CONFLICT (subscriber_id, creator_id)
DO UPDATE SET
  subscription_type = 'bundle',
  status = 'active',
  current_period_end = NOW() + INTERVAL '1 year',
  updated_at = NOW();

-- ===========================================
-- VERIFY SETUP
-- ===========================================

-- Check wallet balance
SELECT 'WALLET' as check_type, user_id, balance_tokens
FROM token_wallets
WHERE user_id = 'f56af389-5e37-455e-920e-21de7359c2cd';

-- Check subscription
SELECT 'SUBSCRIPTION' as check_type,
       s.subscriber_id,
       s.creator_id,
       s.subscription_type,
       s.status,
       s.current_period_end
FROM subscriptions s
WHERE s.subscriber_id = 'f56af389-5e37-455e-920e-21de7359c2cd';

-- Check profile exists
SELECT 'PROFILE' as check_type, id, display_name
FROM profiles
WHERE id = 'f56af389-5e37-455e-920e-21de7359c2cd';

-- ===========================================
-- DONE! Demo account now has:
-- - 50,000 tokens in wallet
-- - Full subscription to Lyra's owner (bundle = chat + content)
-- - Valid for 1 year
-- ===========================================

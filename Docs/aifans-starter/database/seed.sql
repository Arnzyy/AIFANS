-- =============================================
-- SEED DATA FOR LOCAL TESTING
-- Run this AFTER the main schema.sql
-- =============================================

-- NOTE: You'll need to create users via the app first,
-- then update these IDs to match your test users.

-- Example: Create a test creator profile
-- First, sign up as a user through the app, then run:

/*
-- Get your user ID from auth.users or profiles table
-- Then update the creator_profiles:

INSERT INTO creator_profiles (user_id, bio, subscription_price, ai_chat_enabled)
VALUES (
  'YOUR-USER-UUID-HERE',
  'Hey there! I''m Luna, your AI companion 💕 I love chatting about life, flirting, and having fun conversations.',
  999, -- £9.99
  true
);

-- Create subscription tiers
INSERT INTO subscription_tiers (creator_id, name, description, price, duration_months, is_featured, is_active)
VALUES 
  ('YOUR-USER-UUID-HERE', 'Basic', 'Access to all posts', 499, 1, false, true),
  ('YOUR-USER-UUID-HERE', 'Premium', 'Posts + DMs + AI Chat', 999, 1, true, true),
  ('YOUR-USER-UUID-HERE', 'VIP', 'Everything + Priority responses', 1999, 1, false, true);

-- Create AI personality
INSERT INTO ai_personalities (creator_id, is_active, persona_name, persona_age, backstory, personality_traits, interests, turn_ons, turn_offs, response_length, emoji_usage, pricing_model, price_per_message)
VALUES (
  'YOUR-USER-UUID-HERE',
  true,
  'Luna',
  23,
  'I''m a digital artist who loves late-night conversations and deep connections. I''m playful but can also be serious when you need me to be.',
  ARRAY['flirty', 'playful', 'sweet', 'teasing'],
  ARRAY['art', 'music', 'gaming', 'philosophy', 'travel'],
  ARRAY['confidence', 'humor', 'creativity', 'intelligence'],
  ARRAY['rudeness', 'impatience', 'arrogance'],
  'medium',
  'some',
  'per_message',
  50 -- £0.50 per message
);

-- Create some sample posts
INSERT INTO posts (creator_id, text_content, is_published, is_ppv, ppv_price)
VALUES 
  ('YOUR-USER-UUID-HERE', 'Hey everyone! So excited to be here 💕 Can''t wait to connect with you all!', true, false, null),
  ('YOUR-USER-UUID-HERE', 'New content dropping soon... stay tuned 😘', true, false, null),
  ('YOUR-USER-UUID-HERE', 'Something special just for my premium fans 🔒✨', true, true, 499);
*/

-- =============================================
-- QUICK TEST: Verify tables exist
-- =============================================
SELECT 
  'profiles' as table_name, count(*) as row_count FROM profiles
UNION ALL SELECT 'creator_profiles', count(*) FROM creator_profiles
UNION ALL SELECT 'subscription_tiers', count(*) FROM subscription_tiers
UNION ALL SELECT 'ai_personalities', count(*) FROM ai_personalities
UNION ALL SELECT 'posts', count(*) FROM posts;

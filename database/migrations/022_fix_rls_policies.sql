-- ===========================================
-- Migration: 022_fix_rls_policies.sql
-- Fix RLS for token_pack_purchases (checkout bug)
-- Enable RLS on all flagged tables
-- ===========================================

-- ===========================================
-- 1. FIX: token_pack_purchases INSERT policy
-- This is blocking token checkout (500 error)
-- ===========================================
-- Table already has RLS enabled but no INSERT policy for users

-- Users can insert their own purchase records
DO $$ BEGIN
  CREATE POLICY "Users can insert own token purchases" ON token_pack_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can view their own purchases
DO $$ BEGIN
  CREATE POLICY "Users can view own token purchases" ON token_pack_purchases
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update their own purchases (for status updates)
DO $$ BEGIN
  CREATE POLICY "Users can update own token purchases" ON token_pack_purchases
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 2. FIX: token_wallets RLS
-- ===========================================
ALTER TABLE token_wallets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own wallet" ON token_wallets
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own wallet" ON token_wallets
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own wallet" ON token_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- 3. Enable RLS on flagged tables
-- ===========================================

-- webhook_events: Only service role should access
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- post_purchases: Users see their own
ALTER TABLE post_purchases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own post purchases" ON post_purchases
    FOR SELECT USING (auth.uid() = buyer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own post purchases" ON post_purchases
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- subscription_tiers: Anyone can read (public pricing)
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can view subscription tiers" ON subscription_tiers
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- post_media: Anyone can read
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can view post media" ON post_media
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- post_likes: Users manage their own
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view all likes" ON post_likes
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own likes" ON post_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own likes" ON post_likes
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- conversations: Participants only
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ai_chat_sessions: Users see their own
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own ai chat sessions" ON ai_chat_sessions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own ai chat sessions" ON ai_chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ai_chat_messages: Users see their own (via session - no user_id column)
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own ai chat messages" ON ai_chat_messages
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM ai_chat_sessions s
        WHERE s.id = ai_chat_messages.session_id
        AND s.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own ai chat messages" ON ai_chat_messages
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM ai_chat_sessions s
        WHERE s.id = ai_chat_messages.session_id
        AND s.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- transactions: Users see their own
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- notifications: Users see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- categories: Public read
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- credit_balances: Users see their own
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own credit balance" ON credit_balances
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- chat_events: Users see their own (may not have user_id - use OTHERS to handle)
DO $$ BEGIN
  ALTER TABLE chat_events ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can view own chat events" ON chat_events
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- token_packs: Public read (product catalog)
ALTER TABLE token_packs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can view token packs" ON token_packs
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- token_config: Public read
ALTER TABLE token_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can view token config" ON token_config
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- blocked_tag_terms: Public read (used for validation)
ALTER TABLE blocked_tag_terms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can view blocked terms" ON blocked_tag_terms
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- creator_profiles: Public read
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can view creator profiles" ON creator_profiles
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Creators can update own profile" ON creator_profiles
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

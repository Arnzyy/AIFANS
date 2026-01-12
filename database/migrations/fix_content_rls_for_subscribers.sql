-- ============================================
-- FIX: Add RLS policy for subscribers to view content
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Subscribers can view subscriber content" ON content_items;
DROP POLICY IF EXISTS "Users can view content they have access to" ON content_items;

-- Add policy for subscribers to view subscriber-only content
-- This allows users who have an active subscription to see 'subscribers' visibility content
CREATE POLICY "Subscribers can view subscriber content" ON content_items
    FOR SELECT USING (
        -- Public content is visible to all (existing policy handles this)
        visibility = 'public'
        OR
        -- Subscribers can see subscriber-only content
        (
            visibility = 'subscribers'
            AND EXISTS (
                SELECT 1 FROM subscriptions s
                WHERE s.subscriber_id = auth.uid()
                AND s.creator_id = content_items.creator_id
                AND s.status = 'active'
                AND s.subscription_type IN ('content', 'bundle')
            )
        )
        OR
        -- PPV content requires separate entitlement (handled in app code)
        -- For now, allow PPV content to be visible (app code hides the actual content)
        visibility = 'ppv'
        OR
        -- Creators can always see their own content
        creator_id IN (SELECT id FROM creators WHERE user_id = auth.uid())
    );

-- Verify the policy was created
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename = 'content_items';

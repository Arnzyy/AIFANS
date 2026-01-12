// ===========================================
// API ROUTE: /api/models/[id]/posts
// Get posts from a creator model (for profile page)
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: modelId } = await params;
    const supabase = await createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAdmin = user ? isAdminUser(user.email) : false;

    // Find the creator for this model
    const { data: model } = await supabase
      .from('creator_models')
      .select('id, creator_id')
      .eq('id', modelId)
      .single();

    if (!model) {
      return NextResponse.json({ posts: [] });
    }

    // Get the creator's user_id for subscription check
    let creatorUserId = model.creator_id;

    // Check if creator_id points to creators table
    const { data: creator } = await supabase
      .from('creators')
      .select('id, user_id')
      .eq('id', model.creator_id)
      .single();

    if (creator) {
      creatorUserId = creator.user_id;
    }

    // Check if user is subscribed
    let isSubscribed = isAdmin;
    if (!isAdmin && user) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('subscriber_id', user.id)
        .eq('creator_id', creatorUserId)
        .eq('status', 'active')
        .maybeSingle();

      isSubscribed = !!subscription;
    }

    // Fetch posts from this creator
    // Try both creator.user_id and creator.id as the posts might reference either
    let posts: any[] = [];

    // First try with user_id
    const { data: postsByUserId } = await supabase
      .from('posts')
      .select('*')
      .eq('creator_id', creatorUserId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (postsByUserId && postsByUserId.length > 0) {
      posts = postsByUserId;
    } else if (creator) {
      // Try with creators.id
      const { data: postsByCreatorId } = await supabase
        .from('posts')
        .select('*')
        .eq('creator_id', creator.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      posts = postsByCreatorId || [];
    }

    // Check which PPV posts the user has unlocked
    const unlockedPostIds = new Set<string>();
    if (user) {
      const { data: purchases } = await supabase
        .from('post_purchases')
        .select('post_id')
        .eq('buyer_id', user.id);

      purchases?.forEach((p) => unlockedPostIds.add(p.post_id));
    }

    // Add is_unlocked status to each post
    const postsWithAccess = posts.map((post) => ({
      ...post,
      // For subscribers: unlock all non-PPV posts
      // For PPV posts: check if they purchased it
      is_unlocked: isAdmin || (isSubscribed && !post.is_ppv) || unlockedPostIds.has(post.id),
    }));

    return NextResponse.json({
      posts: postsWithAccess,
      isSubscribed,
    });
  } catch (error) {
    console.error('Get model posts error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ===========================================
// API ROUTE: /api/creators/[username]/content
// Get a creator's content for fans to browse
// Accepts: username, creator ID, or model ID
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/admin';
import { getSignedDownloadUrl, getKeyFromUrl } from '@/lib/storage/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: creatorId } = await params;
    const supabase = await createServerClient();

    // Get current user (optional - guests can browse content)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Guests can view content (locked/blurred) - no auth required for browsing

    // The creatorId could be:
    // 1. A creator_models.id (for AI models)
    // 2. A creators.id (for human creators)
    // We need to find the actual creator record

    let actualCreatorId = creatorId;
    let modelId: string | null = null;
    let creatorUserId: string | null = null; // The creator's profile/user ID for subscription checks

    // Debug info to return in response
    const debugInfo: Record<string, unknown> = {
      inputId: creatorId,
    };

    // First check if this is a model ID
    const { data: model } = await supabase
      .from('creator_models')
      .select('id, creator_id')
      .eq('id', creatorId)
      .single();

    debugInfo.foundModel = model ? { id: model.id, creator_id: model.creator_id } : null;

    if (model) {
      // It's a model - get content for this specific model
      modelId = model.id;

      // The model.creator_id might be:
      // 1. A creators.id (correct)
      // 2. A user_id/profiles.id (legacy/incorrect)
      // We need to find the actual creator record either way

      // First try: creator_id is actually a creators.id
      const { data: creatorById } = await supabase
        .from('creators')
        .select('id, user_id')
        .eq('id', model.creator_id)
        .single();

      if (creatorById) {
        // Model correctly points to creators table
        actualCreatorId = creatorById.id;
        creatorUserId = creatorById.user_id; // Save for subscription check
        debugInfo.creatorRecord = creatorById;
        debugInfo.lookupMethod = 'direct_creator_id';
      } else {
        // Second try: creator_id is actually a user_id
        const { data: creatorByUserId } = await supabase
          .from('creators')
          .select('id, user_id')
          .eq('user_id', model.creator_id)
          .single();

        if (creatorByUserId) {
          // Model points to user_id - use the actual creators.id
          actualCreatorId = creatorByUserId.id;
          creatorUserId = creatorByUserId.user_id; // Save for subscription check
          debugInfo.creatorRecord = creatorByUserId;
          debugInfo.lookupMethod = 'user_id_fallback';
        } else {
          // No creator found - use the model's creator_id directly
          // (content might be stored with user_id)
          actualCreatorId = model.creator_id;
          debugInfo.lookupMethod = 'raw_model_creator_id';
        }
      }
    } else {
      // Check if it's a valid creator ID
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('id', creatorId)
        .single();

      console.log('[Content API] Direct creator lookup:', creator?.id);

      if (!creator) {
        return NextResponse.json(
          { error: 'Creator not found' },
          { status: 404 }
        );
      }
    }

    debugInfo.actualCreatorId = actualCreatorId;

    // Check if user is admin (full access)
    const isAdmin = user ? isAdminUser(user.email) : false;

    // Check subscription status (content or bundle)
    let hasContentSubscription = isAdmin; // Admins have full access

    if (!isAdmin && user) {
      // Check subscription - model.creator_id IS the profile ID where subscriptions are stored
      // Build list of possible IDs to check (for backwards compatibility)
      const possibleCreatorIds = new Set<string>();

      // Always include actualCreatorId
      possibleCreatorIds.add(actualCreatorId);

      // For models, model.creator_id IS the profile ID - always include it
      if (model) {
        possibleCreatorIds.add(model.creator_id);
      }

      // Include creatorUserId if different
      if (creatorUserId) {
        possibleCreatorIds.add(creatorUserId);
      }

      const idsToCheck = Array.from(possibleCreatorIds);
      debugInfo.checkedIds = idsToCheck;

      // Single query with IN clause
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id, subscription_type')
        .eq('subscriber_id', user.id)
        .in('creator_id', idsToCheck)
        .eq('status', 'active')
        .in('subscription_type', ['content', 'bundle'])
        .limit(1)
        .maybeSingle();

      hasContentSubscription = !!subscription;
      debugInfo.subscriptionFound = !!subscription;
      if (subscription) {
        debugInfo.subscriptionType = subscription.subscription_type;
      }
    }

    // Build content items query
    let contentQuery = supabase
      .from('content_items')
      .select('*')
      .eq('creator_id', actualCreatorId)
      .order('created_at', { ascending: false });

    // Non-subscribers only see PPV content (purchasable), subscribers see all
    if (!hasContentSubscription) {
      contentQuery = contentQuery.eq('visibility', 'ppv');
    }

    // MODERATION: Only show approved content (admins see all)
    if (!isAdmin) {
      contentQuery = contentQuery.eq('moderation_status', 'approved');
    }

    // Run content items, PPV entitlements, and PPV offers queries IN PARALLEL
    const [contentResult, entitlementsResult, ppvOffersResult] = await Promise.all([
      contentQuery,
      user
        ? supabase.from('ppv_entitlements').select('offer_id, content_ids').eq('user_id', user.id)
        : Promise.resolve({ data: null }),
      supabase.from('ppv_offers').select('id, price_tokens, content_ids').eq('creator_id', actualCreatorId).eq('is_active', true),
    ]);

    const { data: items, error: contentError } = contentResult;

    debugInfo.itemsFound = items?.length || 0;

    if (contentError) {
      console.error('Content fetch error:', contentError);
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: 500 }
      );
    }

    // Build set of unlocked content IDs from PPV purchases
    const unlockedContentIds = new Set<string>();
    entitlementsResult.data?.forEach((ent: any) => {
      if (ent.content_ids && Array.isArray(ent.content_ids)) {
        ent.content_ids.forEach((id: string) => unlockedContentIds.add(id));
      }
    });

    // Get PPV prices for items
    const ppvOffers = ppvOffersResult.data;

    // Map content_id to price
    const contentPriceMap = new Map<string, number>();
    ppvOffers?.forEach((offer) => {
      if (offer.content_ids && Array.isArray(offer.content_ids)) {
        offer.content_ids.forEach((contentId: string) => {
          // Convert tokens to GBP (100 tokens = £1)
          contentPriceMap.set(contentId, offer.price_tokens / 100);
        });
      }
    });

    // Transform content items to expected format
    // SECURITY: Only return content_url for UNLOCKED content
    const contentFromItems = await Promise.all((items || []).map(async (item) => {
      const isPpv = item.visibility === 'ppv';
      // Subscribers see all content as unlocked (they paid for subscription)
      // PPV content packs are only for non-subscribers to purchase
      const isUnlocked = isAdmin || hasContentSubscription || !isPpv || unlockedContentIds.has(item.id);
      const price = contentPriceMap.get(item.id);

      // SECURITY FIX: Only provide content_url if unlocked
      // Locked content only gets thumbnail for blur/preview
      let contentUrl: string | null = null;
      if (isUnlocked && item.url) {
        // For unlocked paid content, use signed URL for extra security
        const key = getKeyFromUrl(item.url);
        if (key && isPpv) {
          // Signed URL expires in 1 hour - prevents URL sharing
          contentUrl = await getSignedDownloadUrl(key, 3600);
        } else {
          contentUrl = item.url;
        }
      }

      return {
        id: item.id,
        creator_id: item.creator_id,
        type: item.type as 'image' | 'video',
        thumbnail_url: item.thumbnail_url || item.url,
        content_url: contentUrl,
        is_ppv: isPpv,
        price: price,
        title: item.title,
        is_unlocked: isUnlocked,
        created_at: item.created_at,
        source: 'content' as const,
        // Include moderation status for admins
        ...(isAdmin && { moderation_status: item.moderation_status }),
      };
    }));

    // Also fetch posts from this creator that have media
    // IMPORTANT: Posts are ONLY for subscribers - non-subscribers should not see any posts
    let contentFromPosts: any[] = [];

    // Only fetch posts if user has subscription (or is admin)
    if (hasContentSubscription || isAdmin) {
      // Build list of possible creator IDs for posts
      const possibleCreatorIds = [actualCreatorId];
      if (creatorUserId && creatorUserId !== actualCreatorId) {
        possibleCreatorIds.push(creatorUserId);
      }

      // Run post purchases and posts queries IN PARALLEL
      const [postPurchasesResult, postsResult] = await Promise.all([
        user
          ? supabase.from('post_purchases').select('post_id').eq('buyer_id', user.id)
          : Promise.resolve({ data: null }),
        supabase
          .from('posts')
          .select('*')
          .in('creator_id', possibleCreatorIds)
          .eq('is_published', true)
          .not('media_urls', 'is', null)
          .order('created_at', { ascending: false }),
      ]);

      // Build set of unlocked post IDs
      const unlockedPostIds = new Set<string>();
      postPurchasesResult.data?.forEach((p: any) => unlockedPostIds.add(p.post_id));

      // Transform posts to content format
      // SECURITY: Only return content_url for UNLOCKED content
      const postsWithMedia = postsResult.data || [];
      contentFromPosts = await Promise.all(postsWithMedia
        .filter((post: any) => post.media_urls && post.media_urls.length > 0)
        .map(async (post: any) => {
          const isPpvPost = post.is_ppv || false;
          // For PPV posts: locked unless purchased OR admin
          // For non-PPV posts: unlocked for subscribers (they already have access)
          const isUnlocked = isAdmin || (!isPpvPost) || unlockedPostIds.has(post.id);

          // SECURITY FIX: Only provide content_url if unlocked
          let contentUrl: string | null = null;
          if (isUnlocked && post.media_urls[0]) {
            // For unlocked PPV posts, use signed URL for extra security
            const key = getKeyFromUrl(post.media_urls[0]);
            if (key && isPpvPost) {
              contentUrl = await getSignedDownloadUrl(key, 3600);
            } else {
              contentUrl = post.media_urls[0];
            }
          }

          return {
            id: `post-${post.id}`,
            post_id: post.id,
            creator_id: post.creator_id,
            type: 'image' as const,
            thumbnail_url: post.media_urls[0],
            content_url: contentUrl,
            is_ppv: isPpvPost,
            price: post.ppv_price ? post.ppv_price / 100 : undefined,
            title: post.text_content?.substring(0, 50),
            is_unlocked: isUnlocked,
            created_at: post.created_at,
            source: 'post' as const,
          };
        }));
    }

    // Merge and deduplicate by thumbnail URL (avoid showing same image twice)
    const seenUrls = new Set<string>();
    const allContent = [...contentFromItems, ...contentFromPosts];
    const content = allContent
      .filter((item) => {
        const url = item.thumbnail_url;
        if (seenUrls.has(url)) {
          return false; // Skip duplicate
        }
        seenUrls.add(url);
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      content,
      hasContentSubscription,
      _debug: debugInfo,
    });
  } catch (error) {
    console.error('Get creator content error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

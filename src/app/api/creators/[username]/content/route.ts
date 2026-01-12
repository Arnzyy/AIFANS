// ===========================================
// API ROUTE: /api/creators/[username]/content
// Get a creator's content for fans to browse
// Accepts: username, creator ID, or model ID
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: creatorId } = await params;
    const supabase = await createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const isAdmin = isAdminUser(user.email);

    // Check subscription status (content or bundle)
    let hasContentSubscription = isAdmin; // Admins have full access

    if (!isAdmin) {
      // Check subscription - subscriptions use the creator's profile/user_id
      // Try with creatorUserId first (the profile ID that foreign key requires)
      let { data: subscription } = creatorUserId
        ? await supabase
            .from('subscriptions')
            .select('id, subscription_type')
            .eq('subscriber_id', user.id)
            .eq('creator_id', creatorUserId)
            .eq('status', 'active')
            .in('subscription_type', ['content', 'bundle'])
            .limit(1)
            .maybeSingle()
        : { data: null };

      // If not found, try with actualCreatorId (creators table ID)
      if (!subscription) {
        const { data: creatorSub } = await supabase
          .from('subscriptions')
          .select('id, subscription_type')
          .eq('subscriber_id', user.id)
          .eq('creator_id', actualCreatorId)
          .eq('status', 'active')
          .in('subscription_type', ['content', 'bundle'])
          .limit(1)
          .maybeSingle();
        subscription = creatorSub;
      }

      // If still not found and we have a model ID, try with model ID
      if (!subscription && modelId) {
        const { data: modelSub } = await supabase
          .from('subscriptions')
          .select('id, subscription_type')
          .eq('subscriber_id', user.id)
          .eq('creator_id', modelId)
          .eq('status', 'active')
          .in('subscription_type', ['content', 'bundle'])
          .limit(1)
          .maybeSingle();
        subscription = modelSub;
      }

      hasContentSubscription = !!subscription;
      debugInfo.subscriptionFound = !!subscription;
      debugInfo.checkedCreatorUserId = creatorUserId;
      debugInfo.checkedCreatorId = actualCreatorId;
      debugInfo.checkedModelId = modelId;
    }

    // Build query for content items
    // Note: Show ALL creator's content on model profiles
    // This allows creators to upload once and content appears on all their models
    let query = supabase
      .from('content_items')
      .select('*')
      .eq('creator_id', actualCreatorId)
      .order('created_at', { ascending: false });

    // Only show public content if no subscription
    if (!hasContentSubscription) {
      query = query.eq('visibility', 'public');
    }

    const { data: items, error: contentError } = await query;

    debugInfo.itemsFound = items?.length || 0;
    if (items && items.length > 0) {
      debugInfo.firstItemCreatorId = items[0].creator_id;
    }

    if (contentError) {
      console.error('Content fetch error:', contentError);
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: 500 }
      );
    }

    // If no items found and this is a model, try getting content through the creator's user_id
    if ((!items || items.length === 0) && model) {
      // Get the creator to find their user_id
      const { data: creatorForUser } = await supabase
        .from('creators')
        .select('id, user_id')
        .eq('id', model.creator_id)
        .single();

      if (creatorForUser) {
        // Check if content might be stored with user_id as creator_id (data mismatch)
        const { data: altItems } = await supabase
          .from('content_items')
          .select('*')
          .eq('creator_id', creatorForUser.user_id)
          .order('created_at', { ascending: false });

        debugInfo.altLookupByUserId = altItems?.length || 0;
        debugInfo.creatorUserId = creatorForUser.user_id;

        // Also try just getting all content and logging creator_ids
        const { data: allContent } = await supabase
          .from('content_items')
          .select('id, creator_id')
          .limit(10);
        debugInfo.sampleContentCreatorIds = allContent?.map(c => c.creator_id);
      }
    }

    // Get PPV entitlements for this user
    const { data: entitlements } = await supabase
      .from('ppv_entitlements')
      .select('offer_id, content_ids')
      .eq('user_id', user.id);

    // Build set of unlocked content IDs from PPV purchases
    const unlockedContentIds = new Set<string>();
    entitlements?.forEach((ent) => {
      if (ent.content_ids && Array.isArray(ent.content_ids)) {
        ent.content_ids.forEach((id: string) => unlockedContentIds.add(id));
      }
    });

    // Get PPV prices for items
    const { data: ppvOffers } = await supabase
      .from('ppv_offers')
      .select('id, price_tokens, content_ids')
      .eq('creator_id', actualCreatorId)
      .eq('is_active', true);

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

    // Transform to expected format
    const content = (items || []).map((item) => {
      const isPpv = item.visibility === 'ppv';
      // Admins see all content as unlocked
      const isUnlocked = isAdmin || !isPpv || unlockedContentIds.has(item.id);
      const price = contentPriceMap.get(item.id);

      return {
        id: item.id,
        creator_id: item.creator_id,
        type: item.type as 'image' | 'video',
        thumbnail_url: item.thumbnail_url || item.url,
        content_url: item.url,
        is_ppv: isPpv,
        price: price,
        title: item.title,
        is_unlocked: isUnlocked,
        created_at: item.created_at,
      };
    });

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

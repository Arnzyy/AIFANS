// ===========================================
// API ROUTE: /api/creators/[username]/content
// Get a creator's content for fans to browse
// Accepts: username, creator ID, or model ID
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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

    // First check if this is a model ID
    const { data: model } = await supabase
      .from('creator_models')
      .select('id, creator_id')
      .eq('id', creatorId)
      .single();

    if (model) {
      // It's a model - get content for this specific model
      actualCreatorId = model.creator_id;
      modelId = model.id;
    } else {
      // Check if it's a valid creator ID
      const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('id', creatorId)
        .single();

      if (!creator) {
        return NextResponse.json(
          { error: 'Creator not found' },
          { status: 404 }
        );
      }
    }

    // Check subscription status (content or bundle)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, subscription_type')
      .eq('subscriber_id', user.id)
      .eq('creator_id', actualCreatorId)
      .eq('status', 'active')
      .in('subscription_type', ['content', 'bundle'])
      .limit(1)
      .single();

    const hasContentSubscription = !!subscription;

    // Build query for content items
    let query = supabase
      .from('content_items')
      .select('*')
      .eq('creator_id', actualCreatorId)
      .order('created_at', { ascending: false });

    // If looking at a specific model, filter by model_id
    if (modelId) {
      query = query.eq('model_id', modelId);
    }

    // Only show public content if no subscription
    if (!hasContentSubscription) {
      query = query.eq('visibility', 'public');
    }

    const { data: items, error: contentError } = await query;

    if (contentError) {
      console.error('Content fetch error:', contentError);
      return NextResponse.json(
        { error: 'Failed to fetch content' },
        { status: 500 }
      );
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
      const isUnlocked = !isPpv || unlockedContentIds.has(item.id);
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
    });
  } catch (error) {
    console.error('Get creator content error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

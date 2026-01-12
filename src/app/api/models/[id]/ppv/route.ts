// ===========================================
// API ROUTE: /api/models/[id]/ppv
// Get PPV offers available for purchase on a model's profile
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: modelId } = await params;
    const supabase = await createServerClient();

    // Get current user (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // First get the model to find the creator
    const { data: model } = await supabase
      .from('creator_models')
      .select('id, creator_id')
      .eq('id', modelId)
      .single();

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Get active PPV offers for this model
    const { data: offers, error } = await supabase
      .from('ppv_offers')
      .select(`
        id,
        title,
        description,
        preview_url,
        price_tokens,
        content_ids,
        created_at
      `)
      .eq('model_id', modelId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching PPV offers:', error);
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    }

    // Get user's purchased offers if logged in
    const purchasedOfferIds = new Set<string>();
    if (user) {
      const { data: entitlements } = await supabase
        .from('ppv_entitlements')
        .select('offer_id')
        .eq('user_id', user.id);

      entitlements?.forEach((e) => purchasedOfferIds.add(e.offer_id));
    }

    // Get preview images for each offer (first item from content_ids)
    const offersWithPreviews = await Promise.all(
      (offers || []).map(async (offer) => {
        let previewImages: string[] = [];

        if (offer.content_ids?.length > 0) {
          // Get thumbnails for first 4 content items
          const { data: contentItems } = await supabase
            .from('content_items')
            .select('thumbnail_url, url')
            .in('id', offer.content_ids.slice(0, 4));

          previewImages = contentItems?.map((c) => c.thumbnail_url || c.url) || [];
        }

        return {
          id: offer.id,
          title: offer.title,
          description: offer.description,
          preview_url: offer.preview_url,
          preview_images: previewImages,
          price_tokens: offer.price_tokens,
          price_gbp: offer.price_tokens / 250, // 250 tokens = £1
          item_count: offer.content_ids?.length || 0,
          is_purchased: purchasedOfferIds.has(offer.id),
        };
      })
    );

    return NextResponse.json({
      offers: offersWithPreviews,
    });
  } catch (error) {
    console.error('Error fetching model PPV offers:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

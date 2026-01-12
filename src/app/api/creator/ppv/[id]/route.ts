import { createServerClient } from '@/lib/supabase/server';
import { createCreatorService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/creator/ppv/[id] - Get single PPV offer
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const creatorService = createCreatorService(supabase);
    const creator = await creatorService.getCreator(user.id);

    if (!creator) {
      return NextResponse.json({ error: 'Not a creator' }, { status: 403 });
    }

    // Get PPV offer with model info
    const { data: offer, error } = await supabase
      .from('ppv_offers')
      .select(`
        *,
        model:creator_models!model_id(name, avatar_url)
      `)
      .eq('id', id)
      .eq('creator_id', creator.id)
      .single();

    if (error || !offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Get content items
    let contentItems: any[] = [];
    if (offer.content_ids?.length > 0) {
      const { data: items } = await supabase
        .from('content_items')
        .select('id, url, thumbnail_url, type, title')
        .in('id', offer.content_ids);
      contentItems = items || [];
    }

    return NextResponse.json({
      offer,
      contentItems,
    });
  } catch (error) {
    console.error('Error fetching PPV offer:', error);
    return NextResponse.json({ error: 'Failed to fetch offer' }, { status: 500 });
  }
}

// PATCH /api/creator/ppv/[id] - Update PPV offer
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const creatorService = createCreatorService(supabase);
    const creator = await creatorService.getCreator(user.id);

    if (!creator) {
      return NextResponse.json({ error: 'Not a creator' }, { status: 403 });
    }

    // Verify ownership
    const { data: existingOffer } = await supabase
      .from('ppv_offers')
      .select('id')
      .eq('id', id)
      .eq('creator_id', creator.id)
      .single();

    if (!existingOffer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, price_tokens, is_active } = body;

    // Build update object
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price_tokens !== undefined) {
      if (price_tokens < 100) {
        return NextResponse.json({ error: 'Minimum price is 100 tokens' }, { status: 400 });
      }
      updates.price_tokens = price_tokens;
    }
    if (is_active !== undefined) updates.is_active = is_active;

    // Update offer
    const { data: offer, error } = await supabase
      .from('ppv_offers')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        model:creator_models!model_id(name, avatar_url)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ offer });
  } catch (error) {
    console.error('Error updating PPV offer:', error);
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
  }
}

// DELETE /api/creator/ppv/[id] - Delete PPV offer
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const creatorService = createCreatorService(supabase);
    const creator = await creatorService.getCreator(user.id);

    if (!creator) {
      return NextResponse.json({ error: 'Not a creator' }, { status: 403 });
    }

    // Get offer and verify ownership
    const { data: offer } = await supabase
      .from('ppv_offers')
      .select('id, content_ids')
      .eq('id', id)
      .eq('creator_id', creator.id)
      .single();

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Delete offer
    const { error } = await supabase
      .from('ppv_offers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Optionally reset content visibility back to subscribers
    if (offer.content_ids?.length > 0) {
      await supabase
        .from('content_items')
        .update({ visibility: 'subscribers' })
        .in('id', offer.content_ids);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PPV offer:', error);
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
  }
}

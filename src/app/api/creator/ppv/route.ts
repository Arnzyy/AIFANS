import { createServerClient } from '@/lib/supabase/server';
import { createCreatorService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/creator/ppv - Get creator's PPV offers
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const creatorService = createCreatorService(supabase);

    // Get creator
    const creator = await creatorService.getCreator(user.id);
    if (!creator) {
      return NextResponse.json(
        { error: 'Not a creator' },
        { status: 403 }
      );
    }

    // Get PPV offers
    const { data: offers, error } = await supabase
      .from('ppv_offers')
      .select(`
        *,
        model:creator_models!model_id(name, avatar_url)
      `)
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      offers: offers || [],
    });
  } catch (error) {
    console.error('Error fetching PPV offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PPV offers' },
      { status: 500 }
    );
  }
}

// POST /api/creator/ppv - Create new PPV offer
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const creatorService = createCreatorService(supabase);

    // Get creator
    const creator = await creatorService.getCreator(user.id);
    if (!creator) {
      return NextResponse.json(
        { error: 'Not a creator' },
        { status: 403 }
      );
    }

    if (creator.status !== 'approved') {
      return NextResponse.json(
        { error: 'Creator account not approved' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, preview_url, price_tokens, content_ids, model_id } = body;

    // Validate
    if (!title || !price_tokens || !content_ids?.length) {
      return NextResponse.json(
        { error: 'Title, price, and content items are required' },
        { status: 400 }
      );
    }

    if (price_tokens < 100) {
      return NextResponse.json(
        { error: 'Minimum price is 100 tokens' },
        { status: 400 }
      );
    }

    // Verify content items belong to creator
    const { data: contentItems } = await supabase
      .from('content_items')
      .select('id')
      .eq('creator_id', creator.id)
      .in('id', content_ids);

    if (!contentItems || contentItems.length !== content_ids.length) {
      return NextResponse.json(
        { error: 'Invalid content items' },
        { status: 400 }
      );
    }

    // Create PPV offer
    const { data: offer, error } = await supabase
      .from('ppv_offers')
      .insert({
        creator_id: creator.id,
        model_id: model_id || null,
        title,
        description,
        preview_url,
        price_tokens,
        content_ids,
        is_active: true,
        purchase_count: 0,
        total_revenue: 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Update content items to PPV visibility
    await supabase
      .from('content_items')
      .update({ visibility: 'ppv' })
      .in('id', content_ids);

    return NextResponse.json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error('Error creating PPV offer:', error);
    return NextResponse.json(
      { error: 'Failed to create PPV offer' },
      { status: 500 }
    );
  }
}

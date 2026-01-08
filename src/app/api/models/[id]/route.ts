import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/models/[id] - Get public model profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    // Get model - only approved models are public
    const { data: model, error } = await supabase
      .from('creator_models')
      .select(`
        id,
        name,
        age,
        bio,
        avatar_url,
        banner_url,
        subscription_price,
        nsfw_enabled,
        sfw_enabled,
        created_at,
        creator_id,
        personality,
        physical_traits,
        sfw_personality
      `)
      .eq('id', id)
      .eq('status', 'approved')
      .single();

    if (error || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Get creator info
    const { data: creator } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('id', model.creator_id)
      .single();

    // Get tags
    const { data: modelTags } = await supabase
      .from('model_tags')
      .select('tags(id, name, category)')
      .eq('model_id', id);

    const tags = modelTags?.map((mt: any) => mt.tags).filter(Boolean) || [];

    // Check if current user is subscribed
    const { data: { user } } = await supabase.auth.getUser();
    let isSubscribed = false;

    if (user) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('creator_id', model.creator_id)
        .eq('status', 'active')
        .single();

      isSubscribed = !!subscription;
    }

    return NextResponse.json({
      model: {
        id: model.id,
        name: model.name,
        displayName: model.name,
        age: model.age,
        bio: model.bio || '',
        avatar: model.avatar_url,
        banner: model.banner_url,
        subscriptionPrice: model.subscription_price,
        nsfw_enabled: model.nsfw_enabled,
        sfw_enabled: model.sfw_enabled,
        hasAiChat: true,
        isNew: new Date(model.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        creatorUsername: creator?.username,
        creatorDisplayName: creator?.display_name,
        tags,
      },
      isSubscribed,
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    );
  }
}

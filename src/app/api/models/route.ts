import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/models - Get approved models for explore page
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Base query - only approved models
    let query = supabase
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
        creator_id
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: models, error } = await query;

    if (error) {
      console.error('Error fetching models:', error);
      return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
    }

    // Get creator info for each model
    const creatorIds = Array.from(new Set(models?.map(m => m.creator_id) || []));

    let creators: any[] = [];
    if (creatorIds.length > 0) {
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', creatorIds);
      creators = creatorData || [];
    }

    // Map models with creator info
    const mappedModels = models?.map(model => {
      const creator = creators.find(c => c.id === model.creator_id);
      return {
        id: model.id,
        name: model.name,
        username: creator?.username || 'unknown',
        displayName: model.name,
        age: model.age,
        avatar: model.avatar_url,
        banner: model.banner_url,
        bio: model.bio || '',
        subscriberCount: 0, // TODO: Add subscriber count
        subscriptionPrice: model.subscription_price,
        hasAiChat: true,
        isNew: new Date(model.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        nsfw_enabled: model.nsfw_enabled,
        sfw_enabled: model.sfw_enabled,
        modelType: 'creator_model' as const,
        creatorUsername: creator?.username,
        creatorDisplayName: creator?.display_name,
      };
    }) || [];

    return NextResponse.json({ models: mappedModels });
  } catch (error) {
    console.error('Error in models API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

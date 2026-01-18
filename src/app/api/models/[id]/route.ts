import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminUser } from '@/lib/auth/admin';

// GET /api/models/[id] - Get public model profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    console.log('[API /api/models/[id]] Fetching model:', id);

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
        backstory,
        speaking_style,
        personality_traits,
        emoji_usage
      `)
      .eq('id', id)
      .eq('status', 'approved')
      .single();

    if (error) {
      console.error('[API /api/models/[id]] Database error:', error);
      return NextResponse.json(
        { error: 'Model not found', details: error.message },
        { status: 404 }
      );
    }

    if (!model) {
      console.log('[API /api/models/[id]] Model not found or not approved:', id);
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    console.log('[API /api/models/[id]] Found model:', model.name, 'creator_id:', model.creator_id);

    // Get creator info
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('id', model.creator_id)
      .single();

    console.log('[API /api/models/[id]] Creator lookup:', creator ? `Found: ${creator.username}` : 'Not found', creatorError?.message || '');

    // Get tags
    const { data: modelTags } = await supabase
      .from('model_tags')
      .select('tags(id, name, category)')
      .eq('model_id', id);

    const tags = modelTags?.map((mt: any) => mt.tags).filter(Boolean) || [];

    // Check if current user is subscribed to this model
    const { data: { user } } = await supabase.auth.getUser();
    let isSubscribed = false;

    if (user) {
      // Admin users have full access
      if (isAdminUser(user.email)) {
        console.log('[API /api/models/[id]] Admin user has full access');
        isSubscribed = true;
      } else {
        // Check subscription - RLS policies allow authenticated users to read
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('id, subscription_type, status')
          .eq('subscriber_id', user.id)
          .eq('creator_id', model.creator_id)
          .eq('status', 'active')
          .maybeSingle();

        if (subError) {
          console.error('[API /api/models/[id]] Subscription query error:', subError.message);
        }

        if (subscription) {
          console.log('[API /api/models/[id]] Found subscription:', subscription.id, 'type:', subscription.subscription_type);
          isSubscribed = true;
        } else {
          console.log('[API /api/models/[id]] No subscription found for user:', user.id, 'creator:', model.creator_id);
        }
      }
    } else {
      console.log('[API /api/models/[id]] No authenticated user - content will be locked');
    }

    // Check if AI chat is actually configured (has persona data)
    const hasAiChat = !!(
      model.backstory ||
      model.speaking_style ||
      (model.personality_traits && model.personality_traits.length > 0)
    );

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
        hasAiChat,
        isNew: new Date(model.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        creatorUsername: creator?.username,
        creatorDisplayName: creator?.display_name,
        tags,
        // Persona data for AI chat
        persona: hasAiChat ? {
          backstory: model.backstory,
          speakingStyle: model.speaking_style,
          personalityTraits: model.personality_traits || [],
          emojiUsage: model.emoji_usage || 'moderate',
        } : null,
      },
      isSubscribed,
    });
  } catch (error) {
    console.error('[API /api/models/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    );
  }
}
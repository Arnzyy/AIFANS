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
        isSubscribed = true;
      } else {
        // Get the creator's profile ID (user_id) for subscription lookup
        // Subscriptions are stored with creator's profile_id due to foreign key constraint
        let creatorProfileId: string | null = null;

        // First try: model.creator_id points to creators table
        const { data: creatorRecord } = await supabase
          .from('creators')
          .select('id, user_id')
          .eq('id', model.creator_id)
          .single();

        if (creatorRecord) {
          creatorProfileId = creatorRecord.user_id;
        } else {
          // Fallback: model.creator_id might already be a user_id
          const { data: creatorByUserId } = await supabase
            .from('creators')
            .select('id, user_id')
            .eq('user_id', model.creator_id)
            .single();
          if (creatorByUserId) {
            creatorProfileId = creatorByUserId.user_id;
          }
        }

        // Check subscription using creator's profile ID
        if (creatorProfileId) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('id, subscription_type')
            .eq('subscriber_id', user.id)
            .eq('creator_id', creatorProfileId)
            .eq('status', 'active')
            .in('subscription_type', ['chat', 'bundle'])
            .maybeSingle();

          isSubscribed = !!subscription;
        }

        // Also check with model.id as fallback (legacy support)
        if (!isSubscribed) {
          const { data: modelSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('subscriber_id', user.id)
            .eq('creator_id', model.id)
            .eq('status', 'active')
            .maybeSingle();

          isSubscribed = !!modelSub;
        }
      }
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
    console.error('Error fetching model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    );
  }
}

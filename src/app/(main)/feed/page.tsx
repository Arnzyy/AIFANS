import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FeedClient } from './FeedClient';

export default async function FeedPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/feed');
  }

  // Get user's active subscriptions
  // Subscriptions can be to model IDs or creator profile IDs
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('creator_id')
    .eq('subscriber_id', user.id)
    .eq('status', 'active');

  const subscribedIds = subscriptions?.map(s => s.creator_id) || [];
  console.log('[Feed] User:', user.id, 'Subscribed IDs:', subscribedIds);

  // Get posts from subscribed creators/models
  let posts: any[] = [];

  if (subscribedIds.length > 0) {
    // Subscriptions are to model IDs stored in creator_id column
    // Look up those models to get their owner's profile ID (creator_id on the model)
    const { data: models } = await supabase
      .from('creator_models')
      .select('id, creator_id')
      .in('id', subscribedIds);

    console.log('[Feed] Models found:', models);

    // The model's creator_id points directly to the profile ID of the creator who owns it
    const creatorProfileIds = models?.map(m => m.creator_id).filter(Boolean) || [];
    const subscribedModelIds = models?.map(m => m.id) || [];

    console.log('[Feed] Creator profile IDs:', creatorProfileIds);
    console.log('[Feed] Subscribed model IDs:', subscribedModelIds);

    // Build list of all possible creator IDs for posts:
    // 1. Direct subscription IDs (could be profile IDs for direct creator subscriptions)
    // 2. Creator profile IDs from the models (the owner of the subscribed model)
    const allPossibleCreatorIds = new Set([
      ...subscribedIds,
      ...creatorProfileIds,
    ]);

    // Query posts where:
    // - creator_id matches any of the possible creator profile IDs, OR
    // - model_id matches any of the subscribed model IDs
    const creatorIdList = Array.from(allPossibleCreatorIds).join(',');
    const modelIdList = subscribedModelIds.length > 0 ? subscribedModelIds.join(',') : '';

    console.log('[Feed] Query creatorIdList:', creatorIdList);
    console.log('[Feed] Query modelIdList:', modelIdList);

    let query = supabase
      .from('posts')
      .select(`
        *,
        creator:profiles!posts_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        ),
        model:creator_models(
          id,
          name,
          display_name,
          avatar_url
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20);

    // Build the OR filter for creator_id and model_id
    if (modelIdList) {
      query = query.or(`creator_id.in.(${creatorIdList}),model_id.in.(${modelIdList})`);
    } else {
      query = query.in('creator_id', Array.from(allPossibleCreatorIds));
    }

    const { data, error } = await query;
    console.log('[Feed] Posts query result:', data?.length || 0, 'posts, error:', error);

    posts = data || [];
  }

  // Get suggested creators (not subscribed)
  const { data: suggestedCreators } = await supabase
    .from('profiles')
    .select(`
      *,
      creator_profiles!inner(*)
    `)
    .eq('role', 'creator')
    .not('id', 'in', `(${[user.id, ...subscribedIds].join(',')})`)
    .limit(5);

  return <FeedClient initialPosts={posts} suggestedCreators={suggestedCreators || []} />;
}

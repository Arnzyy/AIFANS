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

  // Get posts from subscribed creators/models
  let posts: any[] = [];

  if (subscribedIds.length > 0) {
    // Subscriptions might be to model IDs, so we need to find the creator profiles for those models
    const { data: models } = await supabase
      .from('creator_models')
      .select('id, creator_id')
      .in('id', subscribedIds);

    // Get the creator IDs from the models (models.creator_id points to creators.id or profile.id)
    const creatorIdsFromModels = models?.map(m => m.creator_id) || [];

    // Also get creators table to find user_ids
    const { data: creators } = await supabase
      .from('creators')
      .select('id, user_id')
      .in('id', creatorIdsFromModels);

    // Build list of all possible creator IDs for posts:
    // 1. Direct subscription IDs (could be profile IDs)
    // 2. Creator IDs from models
    // 3. User IDs from creators table
    const allPossibleCreatorIds = new Set([
      ...subscribedIds,
      ...creatorIdsFromModels,
      ...(creators?.map(c => c.user_id) || []),
    ]);

    // Also get posts that are linked to subscribed model IDs via model_id column
    const subscribedModelIds = models?.map(m => m.id) || [];

    const { data } = await supabase
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
      .or(`creator_id.in.(${Array.from(allPossibleCreatorIds).join(',')}),model_id.in.(${subscribedModelIds.length > 0 ? subscribedModelIds.join(',') : 'null'})`)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20);

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
    .not('id', 'in', `(${[user.id, ...subscribedCreatorIds].join(',')})`)
    .limit(5);

  return <FeedClient initialPosts={posts} suggestedCreators={suggestedCreators || []} />;
}

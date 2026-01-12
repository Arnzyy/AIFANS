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
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('creator_id')
    .eq('subscriber_id', user.id)
    .eq('status', 'active');

  const subscribedCreatorIds = subscriptions?.map(s => s.creator_id) || [];

  // Get posts from subscribed creators
  let posts: any[] = [];

  if (subscribedCreatorIds.length > 0) {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        creator:profiles!posts_creator_id_fkey(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .in('creator_id', subscribedCreatorIds)
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

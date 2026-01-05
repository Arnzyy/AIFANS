import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AI_CHAT_DISCLOSURE } from '@/lib/compliance/constants';
import { ProfileActions, TierSubscribeButton, PostGridItem } from '@/components/profile/ProfileClient';

export default async function CreatorProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = await createServerClient();
  const username = params.username.toLowerCase();

  // Fetch creator
  const { data: creator } = await supabase
    .from('profiles')
    .select(`
      *,
      creator_profiles(*)
    `)
    .eq('username', username)
    .eq('role', 'creator')
    .single();

  if (!creator) {
    notFound();
  }

  const creatorProfile = creator.creator_profiles;

  // Check if current user is subscribed
  const { data: { user } } = await supabase.auth.getUser();
  let isSubscribed = false;
  
  if (user) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('creator_id', creator.id)
      .eq('status', 'active')
      .single();
    
    isSubscribed = !!subscription;
  }

  // Fetch subscription tiers
  const { data: tiers } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('creator_id', creator.id)
    .eq('is_active', true)
    .order('price', { ascending: true });

  // Fetch posts
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('creator_id', creator.id)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(12);

  const creatorData = {
    id: creator.id,
    username: creator.username,
    display_name: creator.display_name,
    avatar_url: creator.avatar_url,
  };

  const tiersData = (tiers || []).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description || '',
    price: t.price,
    duration_months: t.duration_months,
    is_featured: t.is_featured,
  }));

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-16">
          <Link href="/explore" className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
          <Link href="/" className="text-xl font-bold gradient-text">
            AIFans
          </Link>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-purple-500/30 to-pink-500/30">
        {creatorProfile?.banner_url && (
          <img 
            src={creatorProfile.banner_url} 
            alt="" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Profile info */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-16 md:-mt-20 mb-6">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black bg-white/10 overflow-hidden">
            {creator.avatar_url ? (
              <img 
                src={creator.avatar_url} 
                alt={creator.display_name || creator.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">👤</div>
            )}
          </div>

          {/* Action buttons */}
          <ProfileActions 
            creator={creatorData}
            tiers={tiersData}
            isSubscribed={isSubscribed}
          />
        </div>

        {/* Name & bio */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold">
              {creator.display_name || creator.username}
            </h1>
            {creatorProfile?.ai_chat_enabled && (
              <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                🤖 AI Chat
              </span>
            )}
          </div>
          <p className="text-gray-500">@{creator.username}</p>
          
          {creatorProfile?.bio && (
            <p className="mt-4 text-gray-300 whitespace-pre-wrap">
              {creatorProfile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <span className="font-semibold">{creatorProfile?.post_count || 0}</span>
              <span className="text-gray-500 ml-1">posts</span>
            </div>
            <div>
              <span className="font-semibold">{creatorProfile?.subscriber_count || 0}</span>
              <span className="text-gray-500 ml-1">subscribers</span>
            </div>
            <div>
              <span className="font-semibold">{creatorProfile?.likes_count || 0}</span>
              <span className="text-gray-500 ml-1">likes</span>
            </div>
          </div>
        </div>

        {/* AI Chat CTA */}
        {creatorProfile?.ai_chat_enabled && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🤖</div>
              <div className="flex-1">
                <h3 className="font-semibold">AI Chat Available</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {AI_CHAT_DISCLOSURE.medium}
                </p>
                <Link
                  href={`/chat/${creator.username}`}
                  className="inline-block mt-3 px-4 py-2 bg-purple-500 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                >
                  Start Chat
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Tiers */}
        {!isSubscribed && tiersData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Subscription Plans</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {tiersData.map((tier) => (
                <div
                  key={tier.id}
                  className={`p-4 rounded-xl border ${
                    tier.is_featured 
                      ? 'bg-purple-500/10 border-purple-500/30' 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  {tier.is_featured && (
                    <span className="text-xs text-purple-400 font-medium">MOST POPULAR</span>
                  )}
                  <h3 className="font-semibold mt-1">{tier.name}</h3>
                  <p className="text-2xl font-bold mt-2">
                    £{(tier.price / 100).toFixed(2)}
                    <span className="text-sm text-gray-500 font-normal">
                      /{tier.duration_months === 1 ? 'mo' : `${tier.duration_months}mo`}
                    </span>
                  </p>
                  {tier.description && (
                    <p className="text-sm text-gray-400 mt-2">{tier.description}</p>
                  )}
                  <TierSubscribeButton 
                    creator={creatorData}
                    tier={tier}
                    allTiers={tiersData}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts Grid */}
        <div className="pb-8">
          <h2 className="text-lg font-semibold mb-4">Posts</h2>
          
          {posts && posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {posts.map((post) => (
                <PostGridItem
                  key={post.id}
                  post={post}
                  isSubscribed={isSubscribed}
                  creatorId={creator.id}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl bg-white/5 border border-white/10">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-400">No posts yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

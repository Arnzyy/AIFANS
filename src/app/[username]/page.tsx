import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AI_CHAT_DISCLOSURE } from '@/lib/compliance/constants';

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

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-16">
          <Link href="/explore" className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
          <Link href="/" className="text-xl font-bold gradient-text">
            LYRA
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

          {/* Action buttons - desktop */}
          <div className="hidden md:flex absolute right-0 bottom-0 gap-3">
            {isSubscribed ? (
              <>
                <Link
                  href={`/messages/${creator.username}`}
                  className="px-6 py-2.5 rounded-lg bg-white/10 font-medium hover:bg-white/20 transition-colors"
                >
                  Message
                </Link>
                <button className="px-6 py-2.5 rounded-lg border border-purple-500 text-purple-400 font-medium hover:bg-purple-500/10 transition-colors">
                  Subscribed ✓
                </button>
              </>
            ) : (
              <button className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity">
                Subscribe
              </button>
            )}
          </div>
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

        {/* Mobile action buttons */}
        <div className="md:hidden flex gap-3 mb-6">
          {isSubscribed ? (
            <>
              <Link
                href={`/messages/${creator.username}`}
                className="flex-1 py-3 rounded-lg bg-white/10 font-medium text-center hover:bg-white/20 transition-colors"
              >
                Message
              </Link>
              <button className="flex-1 py-3 rounded-lg border border-purple-500 text-purple-400 font-medium hover:bg-purple-500/10 transition-colors">
                Subscribed ✓
              </button>
            </>
          ) : (
            <button className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity">
              Subscribe
            </button>
          )}
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
        {!isSubscribed && tiers && tiers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Subscription Plans</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {tiers.map((tier) => (
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
                  <button className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-medium hover:opacity-90 transition-opacity">
                    Subscribe
                  </button>
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
                <div
                  key={post.id}
                  className="relative aspect-square bg-white/5 overflow-hidden group cursor-pointer"
                >
                  {post.media_url ? (
                    <img 
                      src={post.media_url} 
                      alt="" 
                      className={`w-full h-full object-cover ${
                        post.is_ppv && !isSubscribed ? 'blur-xl' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      📝
                    </div>
                  )}
                  
                  {/* PPV overlay */}
                  {post.is_ppv && !isSubscribed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <span className="text-2xl">🔒</span>
                        <p className="text-xs mt-1">£{((post.ppv_price || 0) / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <span className="text-sm">❤️ {post.likes_count || 0}</span>
                    <span className="text-sm">💬 {post.comments_count || 0}</span>
                  </div>
                </div>
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

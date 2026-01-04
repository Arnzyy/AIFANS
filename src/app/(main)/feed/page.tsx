import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Feed</h1>
        <Link 
          href="/explore"
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          Discover more →
        </Link>
      </div>

      {/* Content */}
      {posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Empty state */}
          <div className="text-center py-12 rounded-xl bg-white/5 border border-white/10">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold mb-2">Your feed is empty</h3>
            <p className="text-gray-400 mb-6">
              Subscribe to creators to see their posts here
            </p>
            <Link
              href="/explore"
              className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Explore Creators
            </Link>
          </div>

          {/* Suggested creators */}
          {suggestedCreators && suggestedCreators.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Suggested for you</h2>
              <div className="space-y-3">
                {suggestedCreators.map((creator) => (
                  <SuggestedCreatorCard key={creator.id} creator={creator} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  const creator = post.creator;
  const timeAgo = getTimeAgo(new Date(post.created_at));

  return (
    <article className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Creator header */}
      <div className="flex items-center gap-3 p-4">
        <Link href={`/${creator.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
            {creator.avatar_url ? (
              <img 
                src={creator.avatar_url} 
                alt={creator.display_name || creator.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">👤</div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link 
            href={`/${creator.username}`}
            className="font-medium hover:text-purple-400 transition-colors"
          >
            {creator.display_name || creator.username}
          </Link>
          <p className="text-sm text-gray-500">@{creator.username} · {timeAgo}</p>
        </div>
        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <span className="text-gray-500">•••</span>
        </button>
      </div>

      {/* Post content */}
      {post.text_content && (
        <div className="px-4 pb-4">
          <p className="whitespace-pre-wrap">{post.text_content}</p>
        </div>
      )}

      {/* Media */}
      {post.is_ppv && !post.is_purchased ? (
        <div className="relative aspect-[4/3] bg-white/5">
          <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-xl">
            <span className="text-4xl mb-3">🔒</span>
            <p className="font-medium mb-2">Premium Content</p>
            <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Unlock for £{((post.ppv_price || 0) / 100).toFixed(2)}
            </button>
          </div>
        </div>
      ) : (
        post.media_url && (
          <div className="aspect-[4/3] bg-white/5">
            <img 
              src={post.media_url} 
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 p-4 border-t border-white/10">
        <button className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors">
          <span>❤️</span>
          <span className="text-sm">{post.likes_count || 0}</span>
        </button>
        <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
          <span>💬</span>
          <span className="text-sm">{post.comments_count || 0}</span>
        </button>
        <button className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors">
          <span>💰</span>
          <span className="text-sm">Tip</span>
        </button>
        <button className="ml-auto text-gray-400 hover:text-purple-400 transition-colors">
          <span>🔖</span>
        </button>
      </div>
    </article>
  );
}

function SuggestedCreatorCard({ creator }: { creator: any }) {
  const creatorProfile = creator.creator_profiles;

  return (
    <Link
      href={`/${creator.username}`}
      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
    >
      <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
        {creator.avatar_url ? (
          <img 
            src={creator.avatar_url} 
            alt={creator.display_name || creator.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{creator.display_name || creator.username}</p>
        <p className="text-sm text-gray-500">@{creator.username}</p>
      </div>

      <div className="text-right">
        <p className="text-sm text-purple-400">
          {creatorProfile?.subscription_price 
            ? `£${(creatorProfile.subscription_price / 100).toFixed(2)}/mo`
            : 'Free'
          }
        </p>
        {creatorProfile?.ai_chat_enabled && (
          <p className="text-xs text-gray-500 mt-1">🤖 AI Chat</p>
        )}
      </div>
    </Link>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  
  return date.toLocaleDateString();
}

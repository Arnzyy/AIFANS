import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch creator stats
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, creator_profiles(*)')
    .eq('id', user?.id)
    .single();

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  // Get subscriber count
  const { count: subscriberCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', user?.id)
    .eq('status', 'active');

  // Get recent posts
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('*')
    .eq('creator_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get earnings this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyEarnings } = await supabase
    .from('transactions')
    .select('amount')
    .eq('creator_id', user?.id)
    .eq('status', 'completed')
    .gte('created_at', startOfMonth.toISOString());

  const totalEarnings = monthlyEarnings?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  // Get unread messages count
  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user?.id)
    .eq('is_read', false);

  const stats = [
    { 
      label: 'Subscribers', 
      value: subscriberCount || 0, 
      change: '+12%',
      href: '/dashboard/subscribers' 
    },
    { 
      label: 'This Month', 
      value: `£${(totalEarnings / 100).toFixed(2)}`, 
      change: '+8%',
      href: '/dashboard/earnings' 
    },
    { 
      label: 'Posts', 
      value: recentPosts?.length || 0, 
      href: '/dashboard/posts' 
    },
    { 
      label: 'Messages', 
      value: unreadMessages || 0, 
      badge: unreadMessages ? 'New' : undefined,
      href: '/dashboard/messages' 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="text-gray-400 mt-1">Here's how your content is performing</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-gray-400">{stat.label}</p>
              {stat.badge && (
                <span className="px-2 py-0.5 text-xs bg-purple-500 rounded-full">
                  {stat.badge}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mt-2">{stat.value}</p>
            {stat.change && (
              <p className="text-sm text-green-400 mt-1">{stat.change} this month</p>
            )}
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          href="/posts/new"
          className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-colors group"
        >
          <div className="text-3xl mb-3">📝</div>
          <h3 className="font-semibold group-hover:text-purple-400 transition-colors">Create Post</h3>
          <p className="text-sm text-gray-400 mt-1">Share new content with your fans</p>
        </Link>

        <Link
          href="/dashboard/ai-personality"
          className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors group"
        >
          <div className="text-3xl mb-3">🎭</div>
          <h3 className="font-semibold group-hover:text-purple-400 transition-colors">AI Personality</h3>
          <p className="text-sm text-gray-400 mt-1">Build your unique AI persona</p>
        </Link>

        <Link
          href="/dashboard/settings"
          className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group"
        >
          <div className="text-3xl mb-3">💳</div>
          <h3 className="font-semibold group-hover:text-purple-400 transition-colors">Subscription Tiers</h3>
          <p className="text-sm text-gray-400 mt-1">Manage your pricing</p>
        </Link>
      </div>

      {/* Recent Posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Posts</h2>
          <Link href="/dashboard/posts" className="text-sm text-purple-400 hover:text-purple-300">
            View all →
          </Link>
        </div>

        {recentPosts && recentPosts.length > 0 ? (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-16 h-16 rounded-lg bg-white/10 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {post.text_content?.slice(0, 50) || 'Untitled post'}
                    {post.text_content?.length > 50 ? '...' : ''}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                    <span>{post.is_ppv ? `£${(post.ppv_price || 0) / 100} PPV` : 'Free'}</span>
                    <span>•</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-400">{post.likes_count || 0} likes</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl bg-white/5 border border-white/10">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400">No posts yet</p>
            <Link
              href="/posts/new"
              className="inline-block mt-4 px-4 py-2 bg-purple-500 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
            >
              Create your first post
            </Link>
          </div>
        )}
      </div>

      {/* AI Chat Status */}
      {creatorProfile?.ai_chat_enabled ? (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <p className="font-medium text-green-400">AI Persona Active</p>
              <p className="text-sm text-gray-400">Your AI persona is chatting with fans 24/7</p>
            </div>
            <Link
              href="/dashboard/ai-personality"
              className="ml-auto px-3 py-1.5 text-sm border border-green-500/30 rounded-lg hover:bg-green-500/10 transition-colors"
            >
              Manage
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <p className="font-medium">Create AI Persona</p>
              <p className="text-sm text-gray-400">Build a unique AI that chats with your fans 24/7</p>
            </div>
            <Link
              href="/dashboard/ai-personality"
              className="ml-auto px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition-opacity"
            >
              Create
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

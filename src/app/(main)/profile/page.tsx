import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Settings, Wallet, BarChart3, Rocket, LogOut, User } from 'lucide-react';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function ProfilePage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/profile');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      creator_profiles(*)
    `)
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  const isCreator = profile.role === 'creator';
  const creatorProfile = profile.creator_profiles;

  // Fetch subscriptions count (if user is a fan)
  const { count: subscriptionsCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('subscriber_id', user.id)
    .eq('status', 'active');

  // Fetch likes count
  const { count: likesCount } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-32 md:h-48 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 overflow-hidden">
          {creatorProfile?.banner_url && (
            <img
              src={creatorProfile.banner_url}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Avatar & Edit Button */}
        <div className="absolute -bottom-16 left-6 flex items-end gap-4">
          <div className="w-32 h-32 rounded-full border-4 border-black bg-white/10 overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">
                {(profile.display_name || profile.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 right-4">
          <Link
            href="/settings"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-20 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">
            {profile.display_name || profile.username}
          </h1>
          {isCreator && (
            <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full">
              Creator
            </span>
          )}
        </div>
        <p className="text-gray-500">@{profile.username}</p>

        {(profile.bio || creatorProfile?.bio) && (
          <p className="mt-4 text-gray-300">
            {creatorProfile?.bio || profile.bio}
          </p>
        )}

        {/* Stats */}
        <div className="flex gap-6 mt-4 text-sm">
          {isCreator && creatorProfile && (
            <>
              <div>
                <span className="font-semibold">{creatorProfile.subscriber_count || 0}</span>
                <span className="text-gray-500 ml-1">subscribers</span>
              </div>
              <div>
                <span className="font-semibold">{creatorProfile.post_count || 0}</span>
                <span className="text-gray-500 ml-1">posts</span>
              </div>
              <div>
                <span className="font-semibold">{creatorProfile.likes_count || 0}</span>
                <span className="text-gray-500 ml-1">likes</span>
              </div>
            </>
          )}
          {!isCreator && (
            <>
              <div>
                <span className="font-semibold">{subscriptionsCount || 0}</span>
                <span className="text-gray-500 ml-1">subscriptions</span>
              </div>
              <div>
                <span className="font-semibold">{likesCount || 0}</span>
                <span className="text-gray-500 ml-1">likes</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/settings"
          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <Settings className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="font-medium">Settings</p>
              <p className="text-sm text-gray-500">Manage your account</p>
            </div>
          </div>
        </Link>

        <Link
          href="/wallet"
          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <Wallet className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-medium">Wallet</p>
              <p className="text-sm text-gray-500">Add funds & history</p>
            </div>
          </div>
        </Link>

        {isCreator ? (
          <Link
            href="/dashboard"
            className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium">Creator Dashboard</p>
                <p className="text-sm text-gray-400">Manage your content</p>
              </div>
            </div>
          </Link>
        ) : (
          <Link
            href="/onboarding/creator"
            className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Rocket className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium">Become a Creator</p>
                <p className="text-sm text-gray-400">Start earning today</p>
              </div>
            </div>
          </Link>
        )}

        <LogoutButton />
      </div>

      {/* Subscriptions (for fans) */}
      {!isCreator && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Subscriptions</h2>
            <Link href="/explore" className="text-sm text-purple-400 hover:text-purple-300">
              Explore creators →
            </Link>
          </div>

          <SubscriptionsList userId={user.id} />
        </div>
      )}

      {/* View Public Profile Link */}
      <div className="text-center">
        <Link
          href={`/${profile.username}`}
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          View public profile →
        </Link>
      </div>
    </div>
  );
}

async function SubscriptionsList({ userId }: { userId: string }) {
  const supabase = await createServerClient();

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      *,
      creator:profiles!subscriptions_creator_id_fkey(
        id, username, display_name, avatar_url
      )
    `)
    .eq('subscriber_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl bg-white/5 border border-white/10">
        <p className="text-gray-400">No active subscriptions</p>
        <Link
          href="/explore"
          className="inline-block mt-4 px-4 py-2 bg-purple-500 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
        >
          Discover Creators
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {subscriptions.map((sub) => (
        <Link
          key={sub.id}
          href={`/${sub.creator.username}`}
          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
              {sub.creator.avatar_url ? (
                <img
                  src={sub.creator.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg">
                  {(sub.creator.display_name || sub.creator.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">
                {sub.creator.display_name || sub.creator.username}
              </p>
              <p className="text-sm text-gray-500">@{sub.creator.username}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

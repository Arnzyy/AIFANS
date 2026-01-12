import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default async function BrowsePage() {
  const supabase = await createServerClient();

  // Get featured creators
  const { data: creators } = await supabase
    .from('creator_profiles')
    .select(`
      user_id,
      profiles!inner (
        username,
        display_name,
        avatar_url,
        bio
      )
    `)
    .eq('is_verified', true)
    .limit(12);

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Browse Creators</h1>
        <p className="text-gray-400 mt-1">Discover amazing content creators</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search creators..."
            className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Creator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {creators?.map((creator) => {
          const profile = creator.profiles as any;
          return (
            <Link
              key={creator.user_id}
              href={`/u/${profile.username}`}
              className="bg-zinc-900 rounded-xl border border-white/10 hover:border-white/20 transition overflow-hidden"
            >
              <div className="h-32 bg-gradient-to-br from-purple-500/30 to-pink-500/30" />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                    {profile.display_name?.charAt(0) || profile.username?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{profile.display_name || profile.username}</p>
                    <p className="text-sm text-gray-400">@{profile.username}</p>
                  </div>
                </div>
                {profile.bio && (
                  <p className="text-sm text-gray-400 line-clamp-2">{profile.bio}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {(!creators || creators.length === 0) && (
        <div className="text-center py-12 bg-zinc-900 rounded-xl border border-white/10">
          <p className="text-gray-400">No creators found</p>
        </div>
      )}
    </div>
  );
}

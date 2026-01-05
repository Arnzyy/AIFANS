import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Search, Sparkles, Clock, TrendingUp, Bot, Gift, User, Plus, ArrowRight } from 'lucide-react';

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const supabase = await createServerClient();
  const searchQuery = searchParams.q || '';
  const category = searchParams.category || '';

  // Fetch creators with their profiles
  let query = supabase
    .from('profiles')
    .select(`
      *,
      creator_profiles!inner(*)
    `)
    .eq('role', 'creator')
    .order('created_at', { ascending: false });

  // Search filter
  if (searchQuery) {
    query = query.or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
  }

  const { data: creators } = await query.limit(24);

  const categories = [
    { id: '', label: 'All', icon: Sparkles },
    { id: 'new', label: 'New', icon: Clock },
    { id: 'popular', label: 'Popular', icon: TrendingUp },
    { id: 'ai-chat', label: 'AI Chat', icon: Bot },
    { id: 'free', label: 'Free', icon: Gift },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Explore Creators</h1>
        <p className="text-gray-400 mt-1">Discover AI models and content creators</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form className="relative">
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search creators..."
            className="w-full px-4 py-3 pl-12 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        </form>
      </div>

      {/* Become a Creator CTA */}
      <Link
        href="/become-creator"
        className="mb-6 flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Plus className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold">Become a Creator</h3>
            <p className="text-sm text-gray-400">Share your AI content and start earning</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
      </Link>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              href={cat.id ? `/explore?category=${cat.id}` : '/explore'}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                category === cat.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Creators Grid */}
      {creators && creators.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold mb-2">No creators found</h3>
          <p className="text-gray-400">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : 'Be the first to join!'}
          </p>
        </div>
      )}

      {/* Load more */}
      {creators && creators.length >= 24 && (
        <div className="text-center mt-8">
          <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

function CreatorCard({ creator }: { creator: any }) {
  const creatorProfile = creator.creator_profiles;

  return (
    <Link
      href={`/${creator.username}`}
      className="group block rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all hover:scale-[1.02]"
    >
      {/* Banner */}
      <div className="relative aspect-[3/2] bg-gradient-to-br from-purple-500/20 to-pink-500/20">
        {creatorProfile?.banner_url && (
          <img
            src={creatorProfile.banner_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}

        {/* Avatar */}
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-full border-4 border-black bg-white/10 overflow-hidden">
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt={creator.display_name || creator.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* AI Chat badge */}
        {creatorProfile?.ai_chat_enabled && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-xs flex items-center gap-1">
            <Bot className="w-3 h-3" />
            <span>AI Chat</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="pt-10 pb-4 px-4">
        <h3 className="font-semibold truncate group-hover:text-purple-400 transition-colors">
          {creator.display_name || creator.username}
        </h3>
        <p className="text-sm text-gray-500">@{creator.username}</p>

        {creatorProfile?.bio && (
          <p className="text-sm text-gray-400 mt-2 line-clamp-2">
            {creatorProfile.bio}
          </p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>{creatorProfile?.subscriber_count || 0} fans</span>
          <span>•</span>
          <span>{creatorProfile?.post_count || 0} posts</span>
        </div>

        {/* Price */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <span className="text-sm">
            {creatorProfile?.subscription_price
              ? `£${(creatorProfile.subscription_price / 100).toFixed(2)}/mo`
              : 'Free'
            }
          </span>
        </div>
      </div>
    </Link>
  );
}

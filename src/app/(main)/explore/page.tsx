import Link from 'next/link';
import { Search, Sparkles, Clock, TrendingUp, Bot, Gift, Plus, ArrowRight, BadgeCheck, Star } from 'lucide-react';
import { mockCreators, searchCreators, type Creator } from '@/lib/data/creators';
import { MODEL_TYPES, CATEGORY_DISCLAIMER } from '@/lib/compliance/constants';

export default function ExplorePage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const searchQuery = searchParams.q || '';
  const category = searchParams.category || '';

  // Filter creators based on search and category
  let creators = searchQuery ? searchCreators(searchQuery) : [...mockCreators];

  // Apply category filters
  if (category === 'new') {
    creators = creators.filter((c) => c.isNew);
  } else if (category === 'popular') {
    creators = [...creators].sort((a, b) => b.subscriberCount - a.subscriberCount);
  } else if (category === 'ai-chat') {
    creators = creators.filter((c) => c.hasAiChat);
  } else if (category === 'free') {
    creators = creators.filter((c) => c.subscriptionPrice < 500);
  } else if (category === 'lyra-originals') {
    creators = creators.filter((c) => c.modelType === 'lyra_original');
  } else if (category === 'featured') {
    creators = creators.filter((c) => c.isFeatured);
  }

  const categories = [
    { id: '', label: 'All', icon: Sparkles },
    { id: 'lyra-originals', label: 'Lyra Originals', icon: Star },
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
      {creators.length > 0 ? (
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
    </div>
  );
}

function CreatorCard({ creator }: { creator: Creator }) {
  const modelTypeInfo = MODEL_TYPES[creator.modelType];
  const isLyraOriginal = creator.modelType === 'lyra_original';

  return (
    <Link
      href={`/${creator.username}`}
      className="group block rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all hover:scale-[1.02]"
    >
      {/* Avatar as main image */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-purple-500/20 to-pink-500/20">
        <img
          src={creator.avatar}
          alt={creator.displayName}
          className="w-full h-full object-cover"
        />

        {/* Model type label - positioned at bottom-left above info */}
        <div className={`absolute bottom-20 md:bottom-24 left-2 px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
          isLyraOriginal
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
            : 'bg-purple-500/80 text-white'
        }`}>
          {modelTypeInfo.label}
        </div>

        {/* Right side badges - positioned at bottom-right above info */}
        <div className="absolute bottom-20 md:bottom-24 right-2 flex flex-col gap-0.5 md:gap-1 items-end">
          {/* AI Chat badge */}
          {creator.hasAiChat && (
            <div className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-black/70 text-[10px] md:text-xs flex items-center gap-0.5 md:gap-1">
              <Bot className="w-2.5 h-2.5 md:w-3 md:h-3 text-purple-400" />
              <span>AI</span>
            </div>
          )}
          {/* New badge */}
          {creator.isNew && (
            <div className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-green-500/80 text-[10px] md:text-xs font-medium">
              New
            </div>
          )}
          {/* Featured badge */}
          {creator.isFeatured && isLyraOriginal && (
            <div className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-amber-500/80 text-[10px] md:text-xs font-medium flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span className="hidden md:inline">Featured</span>
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-1">
            <h3 className="font-semibold truncate group-hover:text-purple-400 transition-colors">
              {creator.displayName}
            </h3>
            {creator.isVerified && (
              <BadgeCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-gray-400">@{creator.username}</p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {creator.subscriberCount.toLocaleString()} subscribers
            </span>
            <span className="text-sm font-medium text-purple-400">
              {creator.subscriptionPrice > 0
                ? `$${(creator.subscriptionPrice / 100).toFixed(2)}/mo`
                : 'Free'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Bot, BadgeCheck, MapPin, Heart, MessageCircle, Lock, Grid3X3, Play, Star } from 'lucide-react';
import { getCreatorByUsername, type Creator } from '@/lib/data/creators';
import { AI_CHAT_DISCLOSURE, MODEL_TYPES, CATEGORY_DISCLAIMER } from '@/lib/compliance/constants';

// Generate mock posts for each creator
function generateMockPosts(creator: Creator) {
  const posts = [];
  for (let i = 0; i < creator.postCount && i < 12; i++) {
    posts.push({
      id: `${creator.id}-${i}`,
      imageUrl: creator.avatar, // Use avatar as placeholder
      likes: Math.floor(Math.random() * 500) + 50,
      comments: Math.floor(Math.random() * 50) + 5,
      isLocked: i > 2, // First 3 posts free, rest locked
      isVideo: i % 4 === 0, // Every 4th post is video
    });
  }
  return posts;
}

export default function CreatorProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const username = params.username.toLowerCase();
  const creator = getCreatorByUsername(username);

  if (!creator) {
    notFound();
  }

  const posts = generateMockPosts(creator);
  const modelTypeInfo = MODEL_TYPES[creator.modelType];
  const isLyraOriginal = creator.modelType === 'lyra_original';

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-16">
          <Link href="/explore" className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
          <Link href="/">
            <Image src="/logo.png" alt="LYRA" width={80} height={28} />
          </Link>
          <div className="w-16" />
        </div>
      </header>

      {/* Banner - using avatar with blur as banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-purple-500/30 to-pink-500/30 overflow-hidden">
        <img
          src={creator.avatar}
          alt=""
          className="w-full h-full object-cover scale-110 blur-2xl opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Profile info */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-16 md:-mt-20 mb-6">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black overflow-hidden">
            <img
              src={creator.avatar}
              alt={creator.displayName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Action buttons - desktop */}
          <div className="hidden md:flex absolute right-0 bottom-0 gap-3">
            <button className="px-6 py-2.5 rounded-lg bg-white/10 font-medium hover:bg-white/20 transition-colors">
              Message
            </button>
            <button className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity">
              Subscribe - ${(creator.subscriptionPrice / 100).toFixed(2)}/mo
            </button>
          </div>
        </div>

        {/* Name & bio */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold">{creator.displayName}</h1>
            {creator.isVerified && (
              <BadgeCheck className="w-6 h-6 text-purple-400" />
            )}
            {/* Model type badge - Lyra Original or Creator Model */}
            <span className={`px-2 py-1 text-xs text-white rounded-full font-medium flex items-center gap-1 ${
              isLyraOriginal
                ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                : 'bg-purple-500/80'
            }`}>
              {isLyraOriginal && <Star className="w-3 h-3" />}
              {modelTypeInfo.label}
            </span>
            {creator.hasAiChat && (
              <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full flex items-center gap-1">
                <Bot className="w-3 h-3" />
                AI Chat
              </span>
            )}
            {creator.isNew && (
              <span className="px-2 py-1 text-xs bg-green-500/80 text-white rounded-full font-medium">
                New
              </span>
            )}
            {creator.isFeatured && isLyraOriginal && (
              <span className="px-2 py-1 text-xs bg-amber-500/80 text-white rounded-full font-medium">
                Featured
              </span>
            )}
          </div>
          <p className="text-gray-500">@{creator.username}</p>

          {creator.location && (
            <div className="flex items-center gap-1 mt-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4" />
              {creator.location}
            </div>
          )}

          {/* Disclosure - required but subtle */}
          <p className="text-xs text-gray-600 mt-2">
            Fictional AI-generated persona
          </p>

          <p className="mt-4 text-gray-300">{creator.bio}</p>

          {/* Tags with disclaimer */}
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {creator.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs bg-white/5 text-gray-400 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2">{CATEGORY_DISCLAIMER}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <span className="font-semibold">{creator.postCount}</span>
              <span className="text-gray-500 ml-1">posts</span>
            </div>
            <div>
              <span className="font-semibold">{creator.subscriberCount.toLocaleString()}</span>
              <span className="text-gray-500 ml-1">subscribers</span>
            </div>
          </div>
        </div>

        {/* Mobile action buttons */}
        <div className="md:hidden flex gap-3 mb-6">
          <button className="flex-1 py-3 rounded-lg bg-white/10 font-medium text-center hover:bg-white/20 transition-colors">
            Message
          </button>
          <button className="flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity">
            Subscribe
          </button>
        </div>

        {/* AI Chat CTA */}
        {creator.hasAiChat && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">AI Chat Available</h3>
                <p className="text-sm text-gray-400 mt-1">{AI_CHAT_DISCLOSURE.medium}</p>
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

        {/* Subscription CTA */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <h3 className="text-xl font-bold mb-2">Subscribe to {creator.displayName}</h3>
          <p className="text-gray-400 mb-4">
            Get full access to all posts, messages, and exclusive content
          </p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold">${(creator.subscriptionPrice / 100).toFixed(2)}</span>
              <span className="text-gray-500">/month</span>
            </div>
            <button className="px-8 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity">
              Subscribe Now
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Grid3X3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Posts</h2>
          </div>

          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square bg-white/5 overflow-hidden group cursor-pointer"
              >
                <img
                  src={post.imageUrl}
                  alt=""
                  className={`w-full h-full object-cover ${post.isLocked ? 'blur-xl scale-110' : ''}`}
                />

                {/* Video indicator */}
                {post.isVideo && !post.isLocked && (
                  <div className="absolute top-2 right-2">
                    <Play className="w-5 h-5 fill-white" />
                  </div>
                )}

                {/* Locked overlay */}
                {post.isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Lock className="w-8 h-8 text-white/80" />
                  </div>
                )}

                {/* Hover overlay */}
                {!post.isLocked && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1 text-sm">
                      <Heart className="w-4 h-4 fill-white" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                      <MessageCircle className="w-4 h-4" />
                      {post.comments}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

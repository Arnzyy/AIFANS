'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PostCard } from '@/components/feed/PostCard';

interface FeedClientProps {
  initialPosts: any[];
  suggestedCreators: any[];
}

export function FeedClient({ initialPosts, suggestedCreators }: FeedClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set());

  const handleHidePost = (postId: string) => {
    setHiddenPostIds(prev => new Set([...Array.from(prev), postId]));
  };

  const visiblePosts = posts.filter(post => !hiddenPostIds.has(post.id));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Feed</h1>
        <Link
          href="/explore"
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          Discover more &rarr;
        </Link>
      </div>

      {/* Content */}
      {visiblePosts.length > 0 ? (
        <div className="space-y-6">
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} onHide={handleHidePost} />
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
          <div className="w-full h-full flex items-center justify-center text-xl">
            {(creator.display_name || creator.username).charAt(0).toUpperCase()}
          </div>
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
          <p className="text-xs text-gray-500 mt-1">AI Chat</p>
        )}
      </div>
    </Link>
  );
}

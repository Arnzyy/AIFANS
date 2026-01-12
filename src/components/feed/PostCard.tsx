'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Eye, EyeOff, Flag, Share2, Bookmark, X, Lock, ImageIcon } from 'lucide-react';

interface PostCardProps {
  post: any;
  onHide?: (postId: string) => void;
}

export function PostCard({ post, onHide }: PostCardProps) {
  const router = useRouter();
  const creator = post.creator;
  // Use model info if post is linked to a model, otherwise use creator
  const displayEntity = post.model ? {
    id: post.model.id,
    username: post.model.name,
    display_name: post.model.display_name || post.model.name,
    avatar_url: post.model.avatar_url,
    isModel: true,
  } : {
    ...creator,
    isModel: false,
  };
  const timeAgo = getTimeAgo(new Date(post.created_at));
  const [showMenu, setShowMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [isSaved, setIsSaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleViewPost = () => {
    setShowMenu(false);
    router.push(`/post/${post.id}`);
  };

  const handleHidePost = () => {
    setShowMenu(false);
    onHide?.(post.id);
  };

  const handleReport = () => {
    setShowMenu(false);
    // TODO: Implement report flow
    alert('Report feature coming soon');
  };

  const handleShare = async () => {
    setShowMenu(false);
    const url = `${window.location.origin}/post/${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${displayEntity.display_name || displayEntity.username}`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleLike = async () => {
    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    // TODO: Call API to like/unlike
    try {
      await fetch(`/api/posts/${post.id}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      });
    } catch (err) {
      // Revert on error
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    }
  };

  const handleSave = async () => {
    setIsSaved(!isSaved);
    // TODO: Call API to save/unsave
  };

  const handleMediaClick = () => {
    if (!post.is_ppv || post.is_unlocked) {
      router.push(`/post/${post.id}`);
    }
  };

  return (
    <article className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Creator/Model header */}
      <div className="flex items-center gap-3 p-4">
        <Link href={displayEntity.isModel ? `/model/${displayEntity.id}` : `/${creator.username}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
            {displayEntity.avatar_url ? (
              <img
                src={displayEntity.avatar_url}
                alt={displayEntity.display_name || displayEntity.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">
                {(displayEntity.display_name || displayEntity.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={displayEntity.isModel ? `/model/${displayEntity.id}` : `/${creator.username}`}
            className="font-medium hover:text-purple-400 transition-colors"
          >
            {displayEntity.display_name || displayEntity.username}
          </Link>
          <p className="text-sm text-gray-500">@{displayEntity.username} · {timeAgo}</p>
        </div>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-xl bg-zinc-900 border border-white/10 shadow-xl z-50">
              <button
                onClick={handleViewPost}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
              >
                <Eye className="w-4 h-4 text-gray-400" />
                <span>View post</span>
              </button>
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
              >
                <Share2 className="w-4 h-4 text-gray-400" />
                <span>Share</span>
              </button>
              <button
                onClick={handleHidePost}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
              >
                <EyeOff className="w-4 h-4 text-gray-400" />
                <span>Hide from feed</span>
              </button>
              <div className="my-1 border-t border-white/10" />
              <button
                onClick={handleReport}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors text-red-400"
              >
                <Flag className="w-4 h-4" />
                <span>Report post</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post content - clickable */}
      <div
        onClick={handleMediaClick}
        className="cursor-pointer"
      >
        {post.text_content && (
          <div className="px-4 pb-4">
            <p className="whitespace-pre-wrap">{post.text_content}</p>
          </div>
        )}

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="relative">
            {post.is_ppv && !post.is_unlocked ? (
              // PPV locked - Fanvue-inspired design
              <div className="relative aspect-[4/3] bg-white/5 overflow-hidden rounded-lg">
                <img
                  src={post.media_urls[0]}
                  alt=""
                  className="w-full h-full object-cover blur-2xl scale-125 opacity-60"
                />
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Frosted glass card */}
                  <div className="bg-black/30 backdrop-blur-md rounded-2xl px-8 py-6 flex flex-col items-center border border-white/10">
                    {/* Avatar with lock badge */}
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-full bg-white/10 overflow-hidden ring-2 ring-white/20">
                        {displayEntity.avatar_url ? (
                          <img
                            src={displayEntity.avatar_url}
                            alt={displayEntity.display_name || displayEntity.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {(displayEntity.display_name || displayEntity.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-gray-800" />
                      </div>
                    </div>

                    <p className="font-medium text-white mb-1">Unlock to view</p>
                    <div className="flex items-center gap-1.5 text-gray-300 text-sm mb-4">
                      <ImageIcon className="w-4 h-4" />
                      <span>{post.media_urls.length} {post.media_urls.length === 1 ? 'Image' : 'Images'}</span>
                    </div>

                    <button className="px-6 py-2.5 bg-white text-gray-900 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors">
                      {Math.round((post.ppv_price || 0) * 2.5)} tokens
                    </button>
                    <p className="text-xs text-gray-400 mt-2">
                      £{((post.ppv_price || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Free or unlocked - show media
              <div className={`grid gap-1 ${post.media_urls.length === 1 ? 'grid-cols-1' : post.media_urls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                {post.media_urls.slice(0, 4).map((url: string, index: number) => (
                  <div
                    key={index}
                    className={`relative bg-white/5 overflow-hidden ${post.media_urls.length === 1 ? 'aspect-[4/3]' : 'aspect-square'} ${post.media_urls.length === 3 && index === 0 ? 'row-span-2 aspect-auto' : ''}`}
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    {post.media_urls.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-2xl font-bold">+{post.media_urls.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 p-4 border-t border-white/10">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
        >
          <span>{isLiked ? '❤️' : '🤍'}</span>
          <span className="text-sm">{likeCount}</span>
        </button>
        <button
          onClick={() => router.push(`/post/${post.id}#comments`)}
          className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors"
        >
          <span>💬</span>
          <span className="text-sm">{post.comments_count || 0}</span>
        </button>
        <button className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors">
          <span>💰</span>
          <span className="text-sm">Tip</span>
        </button>
        <button
          onClick={handleSave}
          className={`ml-auto transition-colors ${isSaved ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'}`}
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>
    </article>
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

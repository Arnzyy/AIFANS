'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Bookmark, Share2, MessageSquare, Lock, X } from 'lucide-react';

interface PostDetailClientProps {
  post: any;
  currentUserId: string;
  hasAccess: boolean;
  isUnlocked: boolean;
}

export function PostDetailClient({ post, currentUserId, hasAccess, isUnlocked }: PostDetailClientProps) {
  const router = useRouter();
  const creator = post.creator;

  // Use model info if post is linked to a model
  const displayEntity = post.model ? {
    id: post.model.id,
    username: post.model.name,
    display_name: post.model.display_name || post.model.name,
    avatar_url: post.model.avatar_url,
    isModel: true,
  } : {
    id: creator.id,
    username: creator.username,
    display_name: creator.display_name || creator.username,
    avatar_url: creator.avatar_url,
    isModel: false,
  };

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleLike = async () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    try {
      await fetch(`/api/posts/${post.id}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      });
    } catch (err) {
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${displayEntity.display_name}`,
          url: url,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments([...comments, data.comment]);
        setComment('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const mediaUrls = post.media_urls || [];
  const showMedia = isUnlocked || !post.is_ppv;
  const displayName = displayEntity.display_name;
  const profileLink = displayEntity.isModel ? `/model/${displayEntity.id}` : `/${creator.username}`;
  const chatLink = displayEntity.isModel ? `/chat/${displayEntity.username}` : `/chat/${creator.username}`;

  return (
    <div className="pb-20">
      {/* Model/Creator header - clickable */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <Link href={profileLink} className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all">
            {displayEntity.avatar_url ? (
              <img
                src={displayEntity.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={profileLink}
            className="font-semibold text-lg hover:text-purple-400 transition-colors"
          >
            {displayName}
          </Link>
          <p className="text-sm text-gray-500">@{displayEntity.username}</p>
        </div>

        {/* Chat button - links to model chat if model exists */}
        <Link
          href={chatLink}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-xl font-medium transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </Link>
      </div>

      {/* Post content */}
      {post.text_content && (
        <div className="p-4">
          <p className="text-lg whitespace-pre-wrap">{post.text_content}</p>
        </div>
      )}

      {/* Media */}
      {mediaUrls.length > 0 && (
        <div className="relative">
          {!showMedia ? (
            // PPV locked
            <div className="relative aspect-[4/3] bg-white/5 overflow-hidden">
              <img
                src={mediaUrls[0]}
                alt=""
                className="w-full h-full object-cover blur-xl scale-110"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <Lock className="w-12 h-12 text-white/60 mb-4" />
                <p className="font-semibold text-xl mb-2">Premium Content</p>
                <p className="text-gray-400 mb-4">{mediaUrls.length} {mediaUrls.length === 1 ? 'item' : 'items'}</p>
                <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity">
                  Unlock for {Math.round((post.ppv_price || 0) * 2.5)} tokens
                </button>
                <p className="text-xs text-gray-400 mt-2">= £{((post.ppv_price || 0) / 100).toFixed(2)}</p>
              </div>
            </div>
          ) : (
            // Show media
            <div className="space-y-1">
              {mediaUrls.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative bg-white/5 cursor-pointer"
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img
                    src={url}
                    alt=""
                    className="w-full h-auto object-contain max-h-[70vh]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div className="px-4 py-3 text-sm text-gray-500 border-b border-white/10">
        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 px-4 py-3 border-b border-white/10 text-sm">
        <span><strong>{likeCount}</strong> <span className="text-gray-500">likes</span></span>
        <span><strong>{post.comments_count || 0}</strong> <span className="text-gray-500">comments</span></span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around py-3 border-b border-white/10">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400 hover:bg-white/5'}`}
        >
          <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
        </button>
        <button
          onClick={() => document.getElementById('comment-input')?.focus()}
          className="flex items-center gap-2 p-3 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-white/5 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 p-3 rounded-lg text-gray-400 hover:text-green-400 hover:bg-white/5 transition-colors"
        >
          <Share2 className="w-6 h-6" />
        </button>
        <button
          onClick={() => setIsSaved(!isSaved)}
          className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${isSaved ? 'text-purple-500' : 'text-gray-400 hover:text-purple-400 hover:bg-white/5'}`}
        >
          <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Comments section */}
      <div className="p-4" id="comments">
        <h3 className="font-semibold mb-4">Comments</h3>

        {/* Comment input */}
        <form onSubmit={handleSubmitComment} className="flex gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">You</span>
          </div>
          <div className="flex-1">
            <input
              id="comment-input"
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!comment.trim() || submitting}
            className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
          >
            {submitting ? '...' : 'Post'}
          </button>
        </form>

        {/* Comments list */}
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.user?.username || 'User'}</p>
                  <p className="text-sm text-gray-300">{c.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full screen image viewer */}
      {selectedImageIndex !== null && showMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedImageIndex(null)}
        >
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-full max-h-full p-4">
            <img
              src={mediaUrls[selectedImageIndex]}
              alt=""
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Navigation */}
          {mediaUrls.length > 1 && (
            <>
              {selectedImageIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(selectedImageIndex - 1);
                  }}
                  className="absolute left-4 p-4 text-white/60 hover:text-white text-4xl"
                >
                  &lsaquo;
                </button>
              )}
              {selectedImageIndex < mediaUrls.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(selectedImageIndex + 1);
                  }}
                  className="absolute right-4 p-4 text-white/60 hover:text-white text-4xl"
                >
                  &rsaquo;
                </button>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60">
                {selectedImageIndex + 1} / {mediaUrls.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Bot, BadgeCheck, MapPin, Heart, MessageCircle, Lock, Grid3X3, Play, Star, Sparkles, ArrowLeft, X, ChevronLeft, ChevronRight, Send, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import { AI_CHAT_DISCLOSURE, MODEL_TYPES, CATEGORY_DISCLAIMER } from '@/lib/compliance/constants';
import { SubscribeModal } from '@/components/shared/SubscribeModal';
import { supabase } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/admin';

interface Tag {
  id: string;
  name: string;
  category: string;
}

interface Model {
  id: string;
  name: string;
  displayName: string;
  age: number;
  bio: string;
  avatar: string;
  banner: string;
  subscriptionPrice: number;
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  hasAiChat: boolean;
  isNew: boolean;
  creatorUsername?: string;
  creatorDisplayName?: string;
  tags: Tag[];
}

interface ContentItem {
  id: string;
  type: 'image' | 'video';
  thumbnail_url: string;
  content_url: string;
  is_ppv: boolean;
  price?: number;
  is_unlocked: boolean;
  created_at: string;
  source?: 'content' | 'post'; // Track where item came from
  post_id?: string; // For posts, store the post ID
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface ModelStats {
  subscriberCount: number;
  imageCount: number;
  videoCount: number;
  totalLikes: number;
  postCount: number;
}

interface PPVOffer {
  id: string;
  title: string;
  description?: string;
  preview_url?: string;
  preview_images: string[];
  price_tokens: number;
  price_gbp: number;
  item_count: number;
  is_purchased: boolean;
}

export default function ModelProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [model, setModel] = useState<Model | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [ppvOffers, setPpvOffers] = useState<PPVOffer[]>([]);
  const [ppvLoading, setPpvLoading] = useState(true);

  // Like/Comment state
  const [likeStatus, setLikeStatus] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Keyboard navigation for content viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPostIndex === null) return;

      if (e.key === 'Escape') {
        setSelectedPostIndex(null);
      } else if (e.key === 'ArrowLeft' && selectedPostIndex > 0) {
        setSelectedPostIndex(selectedPostIndex - 1);
      } else if (e.key === 'ArrowRight' && selectedPostIndex < contentItems.length - 1) {
        setSelectedPostIndex(selectedPostIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPostIndex, contentItems.length]);

  useEffect(() => {
    const fetchModel = async () => {
      console.log('[ModelProfilePage] Fetching model with ID:', id);

      // Check if user is admin (full access to all content)
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsAdmin(isAdminUser(user?.email));

      try {
        const res = await fetch(`/api/models/${id}`);
        console.log('[ModelProfilePage] API response status:', res.status);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('[ModelProfilePage] API error:', res.status, errorData);
          if (res.status === 404) {
            setModel(null);
          }
          return;
        }
        const data = await res.json();
        console.log('[ModelProfilePage] Got model data:', data.model?.name);
        setModel(data.model);
        setIsSubscribed(data.isSubscribed);

        // Fetch content for this model (both content items AND posts with media)
        try {
          // Fetch content items from content library
          const contentRes = await fetch(`/api/creators/${id}/content`);
          let contentItems: ContentItem[] = [];
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            console.log('[ModelProfilePage] Got content:', contentData.content?.length, 'items');
            contentItems = (contentData.content || []).map((item: any) => ({
              ...item,
              source: 'content' as const,
            }));
          }

          // Also fetch posts from this creator that have media
          const postsRes = await fetch(`/api/models/${id}/posts`);
          let postItems: ContentItem[] = [];
          if (postsRes.ok) {
            const postsData = await postsRes.json();
            console.log('[ModelProfilePage] Got posts:', postsData.posts?.length, 'posts');
            // Convert posts to ContentItem format
            postItems = (postsData.posts || [])
              .filter((post: any) => post.media_urls && post.media_urls.length > 0)
              .map((post: any) => ({
                id: `post-${post.id}`,
                post_id: post.id,
                type: 'image' as const,
                thumbnail_url: post.media_urls[0],
                content_url: post.media_urls[0],
                is_ppv: post.is_ppv || false,
                price: post.ppv_price ? post.ppv_price / 100 : undefined,
                is_unlocked: post.is_unlocked || false,
                created_at: post.created_at,
                source: 'post' as const,
              }));
          }

          // Merge and sort by created_at (newest first)
          const allContent = [...contentItems, ...postItems].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setContentItems(allContent);
        } catch (contentErr) {
          console.error('[ModelProfilePage] Error fetching content:', contentErr);
        } finally {
          setContentLoading(false);
        }

        // Fetch stats for this model
        try {
          const statsRes = await fetch(`/api/models/${id}/stats`);
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStats(statsData);
          }
        } catch (statsErr) {
          console.error('[ModelProfilePage] Error fetching stats:', statsErr);
        }

        // Fetch PPV offers for this model
        try {
          const ppvRes = await fetch(`/api/models/${id}/ppv`);
          if (ppvRes.ok) {
            const ppvData = await ppvRes.json();
            setPpvOffers(ppvData.offers || []);
          }
        } catch (ppvErr) {
          console.error('[ModelProfilePage] Error fetching PPV offers:', ppvErr);
        } finally {
          setPpvLoading(false);
        }
      } catch (error) {
        console.error('[ModelProfilePage] Error fetching model:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModel();
  }, [id]);

  // Load like status when content viewer opens
  useEffect(() => {
    if (selectedPostIndex !== null && contentItems[selectedPostIndex]) {
      const contentId = contentItems[selectedPostIndex].id;
      loadLikeStatus(contentId);
      loadComments(contentId);
    }
    // Reset comments view when closing
    if (selectedPostIndex === null) {
      setShowComments(false);
      setComments([]);
    }
  }, [selectedPostIndex]);

  const loadLikeStatus = async (contentId: string) => {
    try {
      const res = await fetch(`/api/content/${contentId}/like`);
      if (res.ok) {
        const data = await res.json();
        setLikeStatus(prev => ({
          ...prev,
          [contentId]: { liked: data.liked, count: data.likeCount }
        }));
      }
    } catch (err) {
      console.error('Error loading like status:', err);
    }
  };

  const toggleLike = async (contentId: string) => {
    if (!currentUser) return;

    const current = likeStatus[contentId] || { liked: false, count: 0 };
    const newLiked = !current.liked;

    // Optimistic update
    setLikeStatus(prev => ({
      ...prev,
      [contentId]: { liked: newLiked, count: current.count + (newLiked ? 1 : -1) }
    }));

    try {
      const res = await fetch(`/api/content/${contentId}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        setLikeStatus(prev => ({
          ...prev,
          [contentId]: { liked: data.liked, count: data.likeCount }
        }));
      }
    } catch (err) {
      // Revert on error
      setLikeStatus(prev => ({
        ...prev,
        [contentId]: current
      }));
    }
  };

  const loadComments = async (contentId: string) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/content/${contentId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async () => {
    if (!currentUser || !newComment.trim() || selectedPostIndex === null) return;

    const contentId = contentItems[selectedPostIndex].id;
    setSubmittingComment(true);

    try {
      const res = await fetch(`/api/content/${contentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(num >= 10000000 ? 0 : 2).replace(/\.?0+$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1).replace(/\.?0+$/, '') + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-2">Model Not Found</h1>
        <p className="text-gray-400 mb-4">This model doesn't exist or hasn't been approved yet.</p>
        <button
          onClick={() => router.push('/explore')}
          className="px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const modelTypeInfo = MODEL_TYPES['creator_model'];

  // Check if user has access (subscribed or admin)
  const hasFullAccess = isSubscribed || isAdmin;

  // Use real content if available, otherwise show placeholder with avatar
  const posts = contentItems.length > 0
    ? contentItems.map((item, i) => ({
        id: item.id,
        postId: item.post_id, // For posts from the posts table
        imageUrl: item.thumbnail_url || item.content_url,
        likes: Math.floor(Math.random() * 500) + 50, // TODO: real likes from DB
        comments: Math.floor(Math.random() * 50) + 5, // TODO: real comments from DB
        isLocked: item.is_ppv && !item.is_unlocked,
        isPpv: item.is_ppv,
        price: item.price,
        isVideo: item.type === 'video',
        source: item.source || 'content',
      }))
    : // Fallback: show avatar as placeholder when no content uploaded
      Array.from({ length: 3 }, (_, i) => ({
        id: `placeholder-${i}`,
        postId: undefined,
        imageUrl: model.avatar,
        likes: 0,
        comments: 0,
        isLocked: i >= 1 && !hasFullAccess,
        isPpv: false,
        price: undefined,
        isVideo: false,
        source: 'placeholder' as const,
      }));

  // Create tiers for subscribe modal
  const tiers = [
    {
      id: 'tier-1',
      name: 'Fan',
      description: 'Access to all posts and messages',
      price: model.subscriptionPrice,
      duration_months: 1,
      is_featured: true,
    }
  ];

  const handleMessage = () => {
    // Always navigate to chat - the chat page will show the welcome message
    // and handle access/subscribe prompts there (better UX to draw users in)
    const chatPath = `/chat/${model.id}`;
    console.log('[ModelProfilePage] Navigating to chat:', chatPath);
    router.push(chatPath);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Back button - positioned below header to avoid overlap with logo */}
      <div className="fixed top-20 left-4 z-40">
        <Link
          href="/explore"
          className="p-2 bg-black/50 backdrop-blur-xl rounded-full hover:bg-black/70 transition-colors inline-flex"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-purple-500/30 to-pink-500/30 overflow-hidden">
        {model.banner ? (
          <img
            src={model.banner}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={model.avatar}
            alt=""
            className="w-full h-full object-cover scale-110 blur-2xl opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

        {/* Stats bar - OnlyFans style */}
        {stats && (
          <div className="absolute top-0 left-0 right-0 bg-black/70 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-6 md:gap-8 py-2.5 text-white">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 opacity-80" />
                <span className="font-semibold">{formatCount(stats.imageCount)}</span>
              </div>
              <span className="text-white/30">|</span>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 opacity-80" />
                <span className="font-semibold">{formatCount(stats.videoCount)}</span>
              </div>
              <span className="text-white/30">|</span>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 opacity-80" />
                <span className="font-semibold">{formatCount(stats.totalLikes)}</span>
              </div>
              {stats.subscriberCount > 0 && (
                <>
                  <span className="text-white/30">|</span>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="font-semibold">{formatCount(stats.subscriberCount)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile info */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-16 md:-mt-20 mb-6">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black overflow-hidden">
            {model.avatar ? (
              <img
                src={model.avatar}
                alt={model.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold">
                {model.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Action buttons - desktop */}
          <div className="hidden md:flex absolute right-0 bottom-0 gap-3">
            {model.hasAiChat && (
              <button
                onClick={handleMessage}
                className="px-6 py-2.5 rounded-lg bg-white/10 font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                Chat
              </button>
            )}
            <button
              onClick={() => setShowSubscribeModal(true)}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity"
            >
              Subscribe - £{(model.subscriptionPrice / 100).toFixed(2)}/mo
            </button>
          </div>
        </div>

        {/* Name & bio */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold">{model.displayName}</h1>
            {/* Model type badge */}
            <span className="px-2 py-1 text-xs text-white rounded-full font-medium flex items-center gap-1 bg-purple-500/80">
              <Sparkles className="w-3 h-3" />
              {modelTypeInfo.label}
            </span>
            {model.hasAiChat && (
              <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full flex items-center gap-1">
                <Bot className="w-3 h-3" />
                AI Chat
              </span>
            )}
            {model.nsfw_enabled && (
              <span className="px-2 py-1 text-xs bg-red-500/80 text-white rounded-full font-medium">
                NSFW
              </span>
            )}
            {model.isNew && (
              <span className="px-2 py-1 text-xs bg-green-500/80 text-white rounded-full font-medium">
                New
              </span>
            )}
          </div>

          {model.creatorUsername && (
            <p className="text-gray-500">by @{model.creatorUsername}</p>
          )}

          <p className="text-sm text-gray-400 mt-1">Age: {model.age}</p>

          {/* Disclosure - required but subtle */}
          <p className="text-xs text-gray-600 mt-2">
            Fictional AI-generated persona
          </p>

          <p className="mt-4 text-gray-300">{model.bio}</p>

          {/* Tags with disclaimer */}
          {model.tags && model.tags.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {model.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 text-xs bg-white/5 text-gray-400 rounded-full"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">{CATEGORY_DISCLAIMER}</p>
            </div>
          )}
        </div>

        {/* Mobile action buttons */}
        <div className="md:hidden flex gap-3 mb-6">
          {model.hasAiChat && (
            <button
              onClick={handleMessage}
              className="flex-1 py-3 rounded-lg bg-white/10 font-medium text-center hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4" />
              Chat
            </button>
          )}
          <button
            onClick={() => setShowSubscribeModal(true)}
            className="flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity"
          >
            Subscribe
          </button>
        </div>

        {/* AI Chat CTA */}
        {model.hasAiChat && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">AI Chat Available</h3>
                <p className="text-sm text-gray-400 mt-1">{AI_CHAT_DISCLOSURE.medium}</p>
                <button
                  onClick={handleMessage}
                  className="inline-block mt-3 px-4 py-2 bg-purple-500 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                >
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription CTA */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <h3 className="text-xl font-bold mb-2">Subscribe to {model.displayName}</h3>
          <p className="text-gray-400 mb-4">
            Get full access to all posts, messages, and exclusive content
          </p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold">£{(model.subscriptionPrice / 100).toFixed(2)}</span>
              <span className="text-gray-500">/month</span>
            </div>
            <button
              onClick={() => setShowSubscribeModal(true)}
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity"
            >
              Subscribe Now
            </button>
          </div>
        </div>

        {/* PPV Offers Section - Only show to non-subscribers since they already have access to this content */}
        {!isSubscribed && ppvOffers.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold">Exclusive Content Packs</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ppvOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                >
                  {/* Preview images grid */}
                  <div className="grid grid-cols-2 gap-1 mb-3 rounded-lg overflow-hidden">
                    {offer.preview_images.slice(0, 4).map((img, i) => (
                      <div key={i} className="aspect-square bg-white/5">
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover blur-lg"
                        />
                      </div>
                    ))}
                    {offer.preview_images.length === 0 && (
                      <div className="col-span-2 aspect-video bg-white/5 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-white/30" />
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-lg">{offer.title}</h3>
                  {offer.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{offer.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-400">
                      {offer.item_count} {offer.item_count === 1 ? 'item' : 'items'}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">£{offer.price_gbp.toFixed(2)}</span>
                      {offer.is_purchased ? (
                        <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                          Purchased
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (!currentUser) {
                              router.push('/login');
                            } else {
                              // TODO: Open purchase modal
                              alert('Purchase flow coming soon! Price: ' + offer.price_tokens + ' tokens');
                            }
                          }}
                          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                        >
                          Buy Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Grid3X3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Content</h2>
          </div>

          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {posts.map((post, index) => (
              <div
                key={post.id}
                onClick={() => {
                  if (post.isLocked && post.isPpv && post.postId) {
                    // For locked PPV posts, navigate to the post page to purchase
                    router.push(`/post/${post.postId}`);
                  } else if (!post.isLocked) {
                    setSelectedPostIndex(index);
                  }
                }}
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

                {/* Locked overlay with price for PPV posts */}
                {post.isLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                    <Lock className="w-6 h-6 md:w-8 md:h-8 text-white/80 mb-1" />
                    {post.isPpv && post.price && (
                      <span className="text-xs md:text-sm font-bold text-white">
                        {'\u00A3'}{post.price.toFixed(2)}
                      </span>
                    )}
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

          {/* Empty state */}
          {posts.length === 0 && !contentLoading && (
            <div className="text-center py-12 text-gray-500">
              <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No content yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Content Viewer Modal */}
      {selectedPostIndex !== null && posts[selectedPostIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedPostIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedPostIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Previous button */}
          {selectedPostIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPostIndex(selectedPostIndex - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-colors bg-black/50 rounded-full"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Next button */}
          {selectedPostIndex < posts.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPostIndex(selectedPostIndex + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white transition-colors bg-black/50 rounded-full"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Content */}
          <div
            className="max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {posts[selectedPostIndex].isVideo ? (
              <video
                src={posts[selectedPostIndex].imageUrl}
                controls
                autoPlay
                className="w-full h-full max-h-[90vh] object-contain"
              />
            ) : (
              <img
                src={posts[selectedPostIndex].imageUrl}
                alt=""
                className="w-full h-full max-h-[90vh] object-contain"
              />
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-sm">
              {selectedPostIndex + 1} / {posts.length}
            </div>
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <SubscribeModal
          creator={{
            id: model.id,
            username: model.creatorUsername || model.id,
            display_name: model.displayName,
            avatar_url: model.avatar,
          }}
          tiers={tiers}
          chatPrice={999} // £9.99 default chat price
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => {
            setShowSubscribeModal(false);
            setIsSubscribed(true);
          }}
        />
      )}
    </div>
  );
}

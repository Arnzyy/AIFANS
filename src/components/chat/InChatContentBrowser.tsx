'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Lock,
  Play,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Image as ImageIcon,
  Images,
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface ContentItem {
  id: string;
  creator_id: string;
  type: 'image' | 'video';
  thumbnail_url: string;
  content_url: string;
  is_ppv: boolean;
  price?: number;
  title?: string;
  is_unlocked: boolean;
  created_at: string;
  source?: 'content' | 'post'; // Track where item came from
  post_id?: string; // For posts from the posts table
}

interface InChatContentBrowserProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (content: ContentItem) => void;
  onSubscribe?: () => void; // Called when user needs content subscription
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function InChatContentBrowser({
  creatorId,
  creatorName,
  creatorAvatar,
  isOpen,
  onClose,
  onSendToChat,
  onSubscribe,
}: InChatContentBrowserProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'images' | 'videos' | 'ppv'>('all');
  const [purchasing, setPurchasing] = useState(false);
  const [hasContentSubscription, setHasContentSubscription] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

  // Fetch content and check subscription
  useEffect(() => {
    if (isOpen) {
      checkSubscriptionAndFetchContent();
    }
  }, [isOpen, creatorId]);

  const checkSubscriptionAndFetchContent = async () => {
    setLoading(true);
    try {
      // Fetch content - API will return subscription status
      const res = await fetch(`/api/creators/${creatorId}/content`);
      const data = await res.json();

      setContent(data.content || []);
      setHasContentSubscription(data.hasContentSubscription ?? false);
      setSubscriptionChecked(true);
    } catch (error) {
      console.error('Failed to fetch content:', error);
      setSubscriptionChecked(true);
    } finally {
      setLoading(false);
    }
  };

  // Filter content
  const filteredContent = content.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'images') return item.type === 'image';
    if (filter === 'videos') return item.type === 'video';
    if (filter === 'ppv') return item.is_ppv && !item.is_unlocked;
    return true;
  });

  // Handle PPV purchase
  const handlePurchase = async (item: ContentItem) => {
    setPurchasing(true);
    try {
      const res = await fetch('/api/purchases/ppv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: item.id,
          creator_id: creatorId,
        }),
      });

      if (res.ok) {
        // Update local state
        setContent((prev) =>
          prev.map((c) => (c.id === item.id ? { ...c, is_unlocked: true } : c))
        );
        // Update selected if viewing
        if (selectedContent?.id === item.id) {
          setSelectedContent({ ...item, is_unlocked: true });
        }
      } else {
        const error = await res.json();
        alert(error.message || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (!isOpen) return null;

  // No content subscription - show paywall
  if (subscriptionChecked && !hasContentSubscription && !loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 safe-area-top">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-sm md:text-base truncate">{creatorName}&apos;s Content</h2>
          </div>
        </div>

        {/* Subscription Required */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            {creatorAvatar ? (
              <img
                src={creatorAvatar}
                alt={creatorName}
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold">
                {creatorName.charAt(0)}
              </div>
            )}
            <Lock className="w-10 h-10 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-bold mb-2">Content Subscription Required</h3>
            <p className="text-gray-400 mb-6">
              Subscribe to {creatorName}&apos;s content to view their photos and videos
            </p>
            {onSubscribe ? (
              <button
                onClick={onSubscribe}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-semibold hover:opacity-90 transition"
              >
                Subscribe to Content
              </button>
            ) : (
              <p className="text-sm text-gray-500">Contact support for subscription options</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col border-b border-white/10 safe-area-top">
        <div className="flex items-center justify-between p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-sm md:text-base truncate">{creatorName}&apos;s Content</h2>
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {filteredContent.length} items
          </span>
        </div>

        {/* Filters - Horizontally scrollable on mobile */}
        <div className="flex gap-2 px-3 pb-3 overflow-x-auto scrollbar-hide">
          {(['all', 'images', 'videos', 'ppv'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
                filter === f
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {f === 'ppv' ? 'PPV' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6">
          <Images className="w-12 h-12 mb-3 opacity-50" />
          <p>No content found</p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-2 text-sm text-purple-400 hover:underline"
            >
              Show all content
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 md:p-4 safe-area-bottom">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 md:gap-2">
            {filteredContent.map((item) => (
              <ContentThumbnail
                key={item.id}
                item={item}
                onClick={() => setSelectedContent(item)}
                hasSubscription={hasContentSubscription}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content Viewer Modal */}
      {selectedContent && (
        <ContentViewer
          item={selectedContent}
          onClose={() => setSelectedContent(null)}
          onPurchase={() => handlePurchase(selectedContent)}
          onSendToChat={
            onSendToChat
              ? () => {
                  onSendToChat(selectedContent);
                  setSelectedContent(null);
                }
              : undefined
          }
          purchasing={purchasing}
          allContent={filteredContent}
          onNavigate={(direction) => {
            const currentIndex = filteredContent.findIndex(
              (c) => c.id === selectedContent.id
            );
            const newIndex =
              direction === 'prev'
                ? (currentIndex - 1 + filteredContent.length) %
                  filteredContent.length
                : (currentIndex + 1) % filteredContent.length;
            setSelectedContent(filteredContent[newIndex]);
          }}
          hasSubscription={hasContentSubscription}
        />
      )}
    </div>
  );
}

// ===========================================
// CONTENT THUMBNAIL
// ===========================================

function ContentThumbnail({
  item,
  onClick,
  hasSubscription,
}: {
  item: ContentItem;
  onClick: () => void;
  hasSubscription: boolean;
}) {
  // For PPV posts: locked if not purchased (even for subscribers)
  // For content items: subscribers have full access
  const isLocked = item.source === 'post'
    ? (item.is_ppv && !item.is_unlocked)
    : (!hasSubscription && !item.is_unlocked);

  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden group active:scale-95 transition-transform"
    >
      {/* Thumbnail */}
      <img
        src={item.thumbnail_url}
        alt=""
        className={`w-full h-full object-cover transition ${
          isLocked ? 'blur-xl scale-110' : 'group-hover:scale-105'
        }`}
      />

      {/* Hover overlay - desktop only */}
      {!isLocked && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition hidden md:block" />
      )}

      {/* Video indicator */}
      {item.type === 'video' && !isLocked && (
        <div className="absolute top-1 right-1 md:top-2 md:right-2 bg-black/60 rounded-full p-0.5 md:p-1">
          <Play className="w-2.5 h-2.5 md:w-3 md:h-3 fill-white" />
        </div>
      )}

      {/* Lock overlay for PPV posts or no subscription */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <Lock className="w-4 h-4 md:w-6 md:h-6 mb-0.5 md:mb-1" />
          {item.is_ppv && item.price && (
            <span className="text-xs md:text-sm font-bold">
              {Math.round(item.price * 250)} tokens
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ===========================================
// CONTENT VIEWER (Mobile-friendly with swipe)
// ===========================================

function ContentViewer({
  item,
  onClose,
  onPurchase,
  onSendToChat,
  purchasing,
  allContent,
  onNavigate,
  hasSubscription,
}: {
  item: ContentItem;
  onClose: () => void;
  onPurchase: () => void;
  onSendToChat?: () => void;
  purchasing: boolean;
  allContent: ContentItem[];
  onNavigate: (direction: 'prev' | 'next') => void;
  hasSubscription: boolean;
}) {
  const router = useRouter();
  // For PPV posts: locked if not purchased (even for subscribers)
  // For content items: subscribers have full access
  const isLocked = item.source === 'post'
    ? (item.is_ppv && !item.is_unlocked)
    : (!hasSubscription && !item.is_unlocked);
  const canNavigate = allContent.length > 1;
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Handle purchase - for posts, navigate to post page
  const handlePurchaseClick = () => {
    if (item.source === 'post' && item.post_id) {
      onClose();
      router.push(`/post/${item.post_id}`);
    } else {
      onPurchase();
    }
  };

  // Handle swipe gestures for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swiped left - go next
        onNavigate('next');
      } else {
        // Swiped right - go prev
        onNavigate('prev');
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Current position indicator
  const currentIndex = allContent.findIndex((c) => c.id === item.id);

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 safe-area-top">
        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Position indicator */}
        {canNavigate && (
          <span className="text-sm text-gray-400">
            {currentIndex + 1} / {allContent.length}
          </span>
        )}

        {/* Spacer for alignment */}
        <div className="w-9" />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Navigation arrows - desktop only */}
        {canNavigate && (
          <>
            <button
              onClick={() => onNavigate('prev')}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition hidden md:block"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={() => onNavigate('next')}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition hidden md:block"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </>
        )}

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center p-4">
          {isLocked ? (
            // Locked content
            <div className="flex flex-col items-center justify-center p-6 md:p-12 bg-zinc-900 rounded-2xl max-w-sm mx-auto">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-xl flex items-center justify-center mb-4 md:mb-6">
                <Lock className="w-10 h-10 md:w-12 md:h-12 text-gray-500" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 text-center">
                {item.source === 'post' ? 'Premium Post' : hasSubscription ? 'Premium Content' : 'Subscription Required'}
              </h3>
              <p className="text-gray-400 mb-4 md:mb-6 text-center text-sm md:text-base">
                {item.source === 'post'
                  ? `Unlock this post for ${'\u00A3'}${item.price?.toFixed(2)}`
                  : hasSubscription
                    ? `Unlock this ${item.type} for ${'\u00A3'}${item.price?.toFixed(2)}`
                    : 'Subscribe to view this content'}
              </p>
              {item.is_ppv && (
                <button
                  onClick={handlePurchaseClick}
                  disabled={purchasing}
                  className="px-6 md:px-8 py-2.5 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2 text-sm md:text-base"
                >
                  {purchasing ? (
                    <>
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                      Unlock {'\u00A3'}{item.price?.toFixed(2)}
                    </>
                  )}
                </button>
              )}
            </div>
          ) : item.type === 'video' ? (
            // Video player
            <video
              src={item.content_url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full rounded-lg"
            />
          ) : (
            // Image viewer
            <img
              src={item.content_url}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-4 safe-area-bottom">
        {!isLocked && onSendToChat && (
          <button
            onClick={onSendToChat}
            className="w-full md:w-auto md:mx-auto px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-full font-medium transition flex items-center justify-center gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            Mention in Chat
          </button>
        )}

        {/* Swipe hint on mobile */}
        {canNavigate && (
          <p className="text-center text-xs text-gray-500 mt-2 md:hidden">
            Swipe left/right to navigate
          </p>
        )}
      </div>
    </div>
  );
}

// ===========================================
// CHAT INTEGRATION HOOK
// ===========================================

export function useInChatContent(creatorId: string) {
  const [isOpen, setIsOpen] = useState(false);

  const openBrowser = () => setIsOpen(true);
  const closeBrowser = () => setIsOpen(false);

  return {
    isOpen,
    openBrowser,
    closeBrowser,
    BrowserComponent: (
      props: Omit<InChatContentBrowserProps, 'isOpen' | 'onClose' | 'creatorId'>
    ) => (
      <InChatContentBrowser
        creatorId={creatorId}
        isOpen={isOpen}
        onClose={closeBrowser}
        {...props}
      />
    ),
  };
}

'use client';

import { useState, useEffect } from 'react';
import { X, Lock, Play, ChevronLeft, ChevronRight, ShoppingCart, Check, Image as ImageIcon } from 'lucide-react';

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
}

interface InChatContentBrowserProps {
  creatorId: string;
  creatorName: string;
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (content: ContentItem) => void;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function InChatContentBrowser({
  creatorId,
  creatorName,
  isOpen,
  onClose,
  onSendToChat,
}: InChatContentBrowserProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'images' | 'videos' | 'ppv'>('all');
  const [purchasing, setPurchasing] = useState(false);

  // Fetch content
  useEffect(() => {
    if (isOpen) {
      fetchContent();
    }
  }, [isOpen, creatorId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/creators/${creatorId}/content`);
      const data = await res.json();
      setContent(data.content || []);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter content
  const filteredContent = content.filter(item => {
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
        setContent(prev =>
          prev.map(c =>
            c.id === item.id ? { ...c, is_unlocked: true } : c
          )
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

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-semibold">{creatorName}'s Content</h2>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'images', 'videos', 'ppv'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                filter === f
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {f === 'ppv' ? '🔒 PPV' : f.charAt(0).toUpperCase() + f.slice(1)}
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
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No content found
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {filteredContent.map(item => (
              <ContentThumbnail
                key={item.id}
                item={item}
                onClick={() => setSelectedContent(item)}
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
          onSendToChat={onSendToChat ? () => {
            onSendToChat(selectedContent);
            setSelectedContent(null);
          } : undefined}
          purchasing={purchasing}
          allContent={filteredContent}
          onNavigate={(direction) => {
            const currentIndex = filteredContent.findIndex(c => c.id === selectedContent.id);
            const newIndex = direction === 'prev' 
              ? (currentIndex - 1 + filteredContent.length) % filteredContent.length
              : (currentIndex + 1) % filteredContent.length;
            setSelectedContent(filteredContent[newIndex]);
          }}
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
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  const isLocked = item.is_ppv && !item.is_unlocked;

  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden group"
    >
      {/* Thumbnail */}
      <img
        src={item.thumbnail_url}
        alt=""
        className={`w-full h-full object-cover transition ${
          isLocked ? 'blur-lg' : 'group-hover:scale-105'
        }`}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition" />

      {/* Video indicator */}
      {item.type === 'video' && (
        <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
          <Play className="w-3 h-3 fill-white" />
        </div>
      )}

      {/* Lock overlay for PPV */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <Lock className="w-6 h-6 mb-1" />
          <span className="text-sm font-bold">£{item.price?.toFixed(2)}</span>
        </div>
      )}
    </button>
  );
}

// ===========================================
// CONTENT VIEWER
// ===========================================

function ContentViewer({
  item,
  onClose,
  onPurchase,
  onSendToChat,
  purchasing,
  allContent,
  onNavigate,
}: {
  item: ContentItem;
  onClose: () => void;
  onPurchase: () => void;
  onSendToChat?: () => void;
  purchasing: boolean;
  allContent: ContentItem[];
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  const isLocked = item.is_ppv && !item.is_unlocked;
  const canNavigate = allContent.length > 1;

  return (
    <div className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows */}
      {canNavigate && (
        <>
          <button
            onClick={() => onNavigate('prev')}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="max-w-4xl max-h-[80vh] relative">
        {isLocked ? (
          // Locked content
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 rounded-2xl">
            <div className="w-32 h-32 bg-white/5 rounded-xl flex items-center justify-center mb-6">
              <Lock className="w-12 h-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Premium Content</h3>
            <p className="text-gray-400 mb-6">Unlock this {item.type} for £{item.price?.toFixed(2)}</p>
            <button
              onClick={onPurchase}
              disabled={purchasing}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2"
            >
              {purchasing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Unlock for £{item.price?.toFixed(2)}
                </>
              )}
            </button>
          </div>
        ) : item.type === 'video' ? (
          // Video player
          <video
            src={item.content_url}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] rounded-lg"
          />
        ) : (
          // Image viewer
          <img
            src={item.content_url}
            alt=""
            className="max-w-full max-h-[80vh] rounded-lg"
          />
        )}
      </div>

      {/* Bottom actions */}
      {!isLocked && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
          {onSendToChat && (
            <button
              onClick={onSendToChat}
              className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 rounded-full font-medium transition flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Mention in Chat
            </button>
          )}
        </div>
      )}
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
    BrowserComponent: (props: Omit<InChatContentBrowserProps, 'isOpen' | 'onClose' | 'creatorId'>) => (
      <InChatContentBrowser
        creatorId={creatorId}
        isOpen={isOpen}
        onClose={closeBrowser}
        {...props}
      />
    ),
  };
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SubscribeModal } from '@/components/shared/SubscribeModal';
import { TipModal } from '@/components/shared/TipModal';
import { useToast } from '@/components/shared/Toast';

interface Creator {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  is_featured: boolean;
}

// Profile Action Buttons (Subscribe/Message)
export function ProfileActions({
  creator,
  tiers,
  isSubscribed: initialSubscribed,
}: {
  creator: Creator;
  tiers: Tier[];
  isSubscribed: boolean;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);

  const handleSubscribeSuccess = () => {
    setIsSubscribed(true);
    addToast('success', `Subscribed to ${creator.display_name || creator.username}!`);
    router.refresh();
  };

  const handleTipSuccess = () => {
    addToast('success', 'Tip sent successfully!');
  };

  // Desktop buttons
  return (
    <>
      {/* Desktop buttons */}
      <div className="hidden md:flex absolute right-0 bottom-0 gap-3">
        {isSubscribed ? (
          <>
            <button
              onClick={() => setShowTipModal(true)}
              className="px-4 py-2.5 rounded-lg bg-yellow-500/20 text-yellow-400 font-medium hover:bg-yellow-500/30 transition-colors"
            >
              💰 Tip
            </button>
            <Link
              href={`/messages/${creator.username}`}
              className="px-6 py-2.5 rounded-lg bg-white/10 font-medium hover:bg-white/20 transition-colors"
            >
              Message
            </Link>
            <button className="px-6 py-2.5 rounded-lg border border-purple-500 text-purple-400 font-medium">
              Subscribed ✓
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowSubscribeModal(true)}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity"
          >
            Subscribe
          </button>
        )}
      </div>

      {/* Mobile buttons */}
      <div className="md:hidden flex gap-3 mb-6">
        {isSubscribed ? (
          <>
            <button
              onClick={() => setShowTipModal(true)}
              className="py-3 px-4 rounded-lg bg-yellow-500/20 text-yellow-400 font-medium"
            >
              💰
            </button>
            <Link
              href={`/messages/${creator.username}`}
              className="flex-1 py-3 rounded-lg bg-white/10 font-medium text-center hover:bg-white/20 transition-colors"
            >
              Message
            </Link>
            <button className="flex-1 py-3 rounded-lg border border-purple-500 text-purple-400 font-medium">
              Subscribed ✓
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowSubscribeModal(true)}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity"
          >
            Subscribe
          </button>
        )}
      </div>

      {/* Modals */}
      {showSubscribeModal && (
        <SubscribeModal
          creator={creator}
          tiers={tiers}
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={handleSubscribeSuccess}
        />
      )}

      {showTipModal && (
        <TipModal
          creator={creator}
          onClose={() => setShowTipModal(false)}
          onSuccess={handleTipSuccess}
        />
      )}
    </>
  );
}

// Tier Subscribe Button
export function TierSubscribeButton({
  creator,
  tier,
  allTiers,
}: {
  creator: Creator;
  tier: Tier;
  allTiers: Tier[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleQuickSubscribe = async () => {
    setLoading(true);
    
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creator.id,
          tier_id: tier.id,
        }),
      });

      if (res.ok) {
        addToast('success', `Subscribed to ${tier.name}!`);
        router.refresh();
      } else {
        const data = await res.json();
        addToast('error', data.error || 'Failed to subscribe');
      }
    } catch (err) {
      addToast('error', 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleQuickSubscribe}
      disabled={loading}
      className="w-full mt-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading ? 'Processing...' : 'Subscribe'}
    </button>
  );
}

// Post Grid Item with Unlock
export function PostGridItem({
  post,
  isSubscribed,
  creatorId,
}: {
  post: any;
  isSubscribed: boolean;
  creatorId: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [unlocked, setUnlocked] = useState(post.is_purchased || false);
  const [loading, setLoading] = useState(false);

  const canView = !post.is_ppv || isSubscribed || unlocked;

  const handleUnlock = async () => {
    setLoading(true);
    
    try {
      const res = await fetch(`/api/posts/${post.id}/unlock`, {
        method: 'POST',
      });

      if (res.ok) {
        setUnlocked(true);
        addToast('success', 'Post unlocked!');
        router.refresh();
      } else {
        const data = await res.json();
        addToast('error', data.error || 'Failed to unlock');
      }
    } catch (err) {
      addToast('error', 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative aspect-square bg-white/5 overflow-hidden group cursor-pointer">
      {post.media_url ? (
        <img 
          src={post.media_url} 
          alt="" 
          className={`w-full h-full object-cover ${!canView ? 'blur-xl' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl">
          📝
        </div>
      )}
      
      {/* PPV overlay */}
      {post.is_ppv && !canView && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <span className="text-2xl">🔒</span>
          <p className="text-xs mt-1">£{((post.ppv_price || 0) / 100).toFixed(2)}</p>
          <button
            onClick={handleUnlock}
            disabled={loading}
            className="mt-2 px-3 py-1 text-xs bg-purple-500 rounded-full hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Unlock'}
          </button>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
        <span className="text-sm">❤️ {post.likes_count || 0}</span>
        <span className="text-sm">💬 {post.comments_count || 0}</span>
      </div>
    </div>
  );
}

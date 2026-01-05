'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubscribeModal } from './SubscribeModal';
import { TipModal } from './TipModal';

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

// Subscribe Button
export function SubscribeButton({
  creator,
  tiers,
  isSubscribed,
  onSuccess,
  className = ''
}: {
  creator: Creator;
  tiers: Tier[];
  isSubscribed: boolean;
  onSuccess?: () => void;
  className?: string;
}) {
  const [showModal, setShowModal] = useState(false);

  if (isSubscribed) {
    return (
      <button
        className={`px-6 py-2.5 rounded-lg border border-purple-500 text-purple-400 font-medium hover:bg-purple-500/10 transition-colors ${className}`}
        disabled
      >
        Subscribed ✓
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity ${className}`}
      >
        Subscribe
      </button>

      {showModal && (
        <SubscribeModal
          creator={creator}
          tiers={tiers}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}

// Tip Button
export function TipButton({
  creator,
  onSuccess,
  className = ''
}: {
  creator: Creator;
  onSuccess?: () => void;
  className?: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors ${className}`}
      >
        <span>💰</span>
        <span className="text-sm">Tip</span>
      </button>

      {showModal && (
        <TipModal
          creator={creator}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onSuccess?.();
          }}
        />
      )}
    </>
  );
}

// Unlock PPV Button
export function UnlockButton({
  postId,
  price,
  onSuccess,
  className = ''
}: {
  postId: string;
  price: number;
  onSuccess?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/posts/${postId}/unlock`, {
        method: 'POST',
      });

      if (res.ok) {
        onSuccess?.();
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to unlock');
      }
    } catch (err) {
      alert('Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUnlock}
      disabled={loading}
      className={`px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 ${className}`}
    >
      {loading ? 'Unlocking...' : `Unlock for £${(price / 100).toFixed(2)}`}
    </button>
  );
}

// Like Button
export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  className = ''
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  className?: string;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);

    const wasLiked = liked;

    // Optimistic update
    setLiked(!liked);
    setCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      });

      if (!res.ok) {
        // Revert on error
        setLiked(wasLiked);
        setCount(prev => wasLiked ? prev + 1 : prev - 1);
      }
    } catch (err) {
      setLiked(wasLiked);
      setCount(prev => wasLiked ? prev + 1 : prev - 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 transition-colors ${
        liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
      } ${className}`}
    >
      <span>{liked ? '❤️' : '🤍'}</span>
      <span className="text-sm">{count}</span>
    </button>
  );
}

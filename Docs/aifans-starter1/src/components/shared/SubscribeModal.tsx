'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PURCHASE_DISCLOSURE } from '@/lib/compliance/constants';

interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  is_featured: boolean;
}

interface SubscribeModalProps {
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  tiers: Tier[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubscribeModal({ creator, tiers, onClose, onSuccess }: SubscribeModalProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<string>(
    tiers.find(t => t.is_featured)?.id || tiers[0]?.id || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    if (!selectedTier) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creator.id,
          tier_id: selectedTier,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      onSuccess?.();
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedTierData = tiers.find(t => t.id === selectedTier);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="relative h-24 bg-gradient-to-br from-purple-500/30 to-pink-500/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-10 mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-zinc-900 bg-white/10 overflow-hidden">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold">Subscribe to {creator.display_name || creator.username}</h2>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Tiers */}
          <div className="mt-4 space-y-2">
            {tiers.map((tier) => (
              <label
                key={tier.id}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                  selectedTier === tier.id
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="tier"
                  value={tier.id}
                  checked={selectedTier === tier.id}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="text-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{tier.name}</p>
                    {tier.is_featured && (
                      <span className="px-2 py-0.5 text-xs bg-purple-500 rounded-full">Popular</span>
                    )}
                  </div>
                  {tier.description && (
                    <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold">£{(tier.price / 100).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    /{tier.duration_months} mo{tier.duration_months > 1 ? 's' : ''}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Disclosure */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            {PURCHASE_DISCLOSURE.subscription}
          </p>

          {/* Dev mode notice */}
          <div className="mt-4 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-400 text-center">
              🚧 DEV MODE: No real payment will be processed
            </p>
          </div>

          {/* Subscribe button */}
          <button
            onClick={handleSubscribe}
            disabled={loading || !selectedTier}
            className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Subscribe for £${((selectedTierData?.price || 0) / 100).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

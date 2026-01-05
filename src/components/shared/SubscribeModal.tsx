'use client';

import { useState } from 'react';
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
    display_name?: string;
    avatar_url?: string;
  };
  tiers: Tier[];
  onClose: () => void;
  onSuccess?: () => void;
}

type BillingPeriod = 'monthly' | '3_month' | 'yearly';

export function SubscribeModal({ creator, tiers, onClose, onSuccess }: SubscribeModalProps) {
  const [selectedTier, setSelectedTier] = useState<string>(
    tiers.find(t => t.is_featured)?.id || tiers[0]?.id || ''
  );
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
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
          creatorId: creator.id,
          tierId: selectedTier,
          billingPeriod: billingPeriod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      // If payment is required, redirect to Stripe Checkout
      if (data.paymentRequired && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Free subscription - no redirect needed
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const selectedTierData = tiers.find(t => t.id === selectedTier);

  // Calculate price based on billing period
  const getDisplayPrice = () => {
    if (!selectedTierData) return '0.00';
    const basePrice = selectedTierData.price / 100;

    switch (billingPeriod) {
      case '3_month':
        return (basePrice * 3 * 0.9).toFixed(2); // 10% discount
      case 'yearly':
        return (basePrice * 12 * 0.75).toFixed(2); // 25% discount
      default:
        return basePrice.toFixed(2);
    }
  };

  const getPeriodLabel = () => {
    switch (billingPeriod) {
      case '3_month': return '3 months';
      case 'yearly': return 'year';
      default: return 'month';
    }
  };

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

          {/* Billing Period Selection */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { value: 'monthly', label: 'Monthly', discount: null },
              { value: '3_month', label: '3 Months', discount: '10% off' },
              { value: 'yearly', label: 'Yearly', discount: '25% off' },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setBillingPeriod(period.value as BillingPeriod)}
                className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                  billingPeriod === period.value
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {period.label}
                {period.discount && (
                  <span className="block text-xs opacity-75">{period.discount}</span>
                )}
              </button>
            ))}
          </div>

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
                  <p className="text-xs text-gray-500">/month</p>
                </div>
              </label>
            ))}
          </div>

          {/* Disclosure */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            {PURCHASE_DISCLOSURE.subscription}
          </p>

          {/* Subscribe button */}
          <button
            onClick={handleSubscribe}
            disabled={loading || !selectedTier}
            className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Redirecting to checkout...' : `Subscribe for £${getDisplayPrice()}/${getPeriodLabel()}`}
          </button>

          <p className="mt-3 text-xs text-gray-500 text-center">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}

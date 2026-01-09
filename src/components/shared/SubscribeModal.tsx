'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
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
  chatPrice?: number; // Price per month for chat in cents
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: 'content' | 'chat' | 'bundle';
  isGuest?: boolean; // If true, redirect to login when subscribing
  redirectPath?: string; // Where to redirect after login
}

type BillingPeriod = 'monthly' | '3_month' | 'yearly';
type SubscriptionType = 'content' | 'chat' | 'bundle';

export function SubscribeModal({ creator, tiers, chatPrice = 999, onClose, onSuccess, defaultType = 'content', isGuest = false, redirectPath }: SubscribeModalProps) {
  const router = useRouter();
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>(defaultType);
  const [selectedTier, setSelectedTier] = useState<string>(
    tiers.find(t => t.is_featured)?.id || tiers[0]?.id || ''
  );
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    // For content/bundle, need a tier selected
    if ((subscriptionType === 'content' || subscriptionType === 'bundle') && !selectedTier) return;

    // If guest, redirect to login with subscription intent
    if (isGuest) {
      const redirect = redirectPath || `/chat/${creator.username}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}&subscribe=true`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
          tierId: subscriptionType === 'chat' ? null : selectedTier,
          billingPeriod: billingPeriod,
          subscriptionType: subscriptionType,
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
  const chatMonthlyPrice = chatPrice / 100;
  const contentMonthlyPrice = selectedTierData ? selectedTierData.price / 100 : 0;

  // Bundle discount: 15% off combined price
  const bundleDiscount = 0.15;
  const bundleMonthlyPrice = (contentMonthlyPrice + chatMonthlyPrice) * (1 - bundleDiscount);

  // Calculate price based on billing period and subscription type
  const getDisplayPrice = () => {
    let basePrice = 0;

    switch (subscriptionType) {
      case 'content':
        basePrice = contentMonthlyPrice;
        break;
      case 'chat':
        basePrice = chatMonthlyPrice;
        break;
      case 'bundle':
        basePrice = bundleMonthlyPrice;
        break;
    }

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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
        {/* Close button - positioned above everything */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition-colors z-50 text-white"
        >
          ✕
        </button>

        {/* Header - gradient */}
        <div className="h-16 bg-gradient-to-br from-purple-500/30 to-pink-500/30" />

        <div className="px-6 pb-6">
          {/* Avatar - positioned to overlap header cleanly */}
          <div className="-mt-10 mb-4 relative z-10">
            <div className="w-20 h-20 rounded-full border-4 border-zinc-900 bg-zinc-800 overflow-hidden">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl bg-zinc-800">👤</div>
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold">Subscribe to {creator.display_name || creator.username}</h2>

          {/* Subscription Type Selection */}
          <div className="mt-4 space-y-2">
            {/* FAN (Content) */}
            <button
              onClick={() => setSubscriptionType('content')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                subscriptionType === 'content'
                  ? 'bg-purple-500/10 border-purple-500'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                subscriptionType === 'content' ? 'bg-purple-500/20' : 'bg-white/10'
              }`}>
                <Heart className={`w-6 h-6 ${subscriptionType === 'content' ? 'text-purple-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">FAN</p>
                <p className="text-sm text-gray-400">Access all posts & content</p>
              </div>
              <div className="text-right">
                <p className="font-bold">£{contentMonthlyPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-500">/month</p>
              </div>
            </button>

            {/* CHAT */}
            <button
              onClick={() => setSubscriptionType('chat')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                subscriptionType === 'chat'
                  ? 'bg-pink-500/10 border-pink-500'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                subscriptionType === 'chat' ? 'bg-pink-500/20' : 'bg-white/10'
              }`}>
                <MessageCircle className={`w-6 h-6 ${subscriptionType === 'chat' ? 'text-pink-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">CHAT</p>
                <p className="text-sm text-gray-400">AI chat access</p>
              </div>
              <div className="text-right">
                <p className="font-bold">£{chatMonthlyPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-500">/month</p>
              </div>
            </button>

            {/* BUNDLE */}
            <button
              onClick={() => setSubscriptionType('bundle')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 relative ${
                subscriptionType === 'bundle'
                  ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-transparent ring-2 ring-purple-500'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              {/* Best Value Badge */}
              <div className="absolute -top-2 right-4 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-medium">
                BEST VALUE
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                subscriptionType === 'bundle' ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : 'bg-white/10'
              }`}>
                <Sparkles className={`w-6 h-6 ${subscriptionType === 'bundle' ? 'text-purple-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">FAN + CHAT</p>
                <p className="text-sm text-gray-400">Everything included</p>
              </div>
              <div className="text-right">
                <p className="font-bold">£{bundleMonthlyPrice.toFixed(2)}</p>
                <p className="text-xs text-green-400">Save 15%</p>
              </div>
            </button>
          </div>

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

          {/* Tiers - only show for content or bundle */}
          {(subscriptionType === 'content' || subscriptionType === 'bundle') && tiers.length > 1 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-400 mb-2">Select a tier:</p>
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
          )}

          {/* Disclosure */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            {subscriptionType === 'chat'
              ? 'AI chat is for entertainment purposes. Messages are AI-generated.'
              : PURCHASE_DISCLOSURE.subscription}
          </p>

          {/* Subscribe button */}
          <button
            onClick={handleSubscribe}
            disabled={loading || ((subscriptionType === 'content' || subscriptionType === 'bundle') && !selectedTier)}
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

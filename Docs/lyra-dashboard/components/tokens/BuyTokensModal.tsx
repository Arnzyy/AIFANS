'use client';

import { useState, useEffect } from 'react';
import { X, Coins, Check, Sparkles, Loader2 } from 'lucide-react';
import { TokenPack, formatPenceAsGbp } from '@/lib/tokens/types';

interface BuyTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BuyTokensModal({ isOpen, onClose, onSuccess }: BuyTokensModalProps) {
  const [packs, setPacks] = useState<TokenPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPacks();
    }
  }, [isOpen]);

  const fetchPacks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tokens/packs');
      if (res.ok) {
        const data = await res.json();
        setPacks(data.packs);
      }
    } catch (error) {
      console.error('Failed to fetch packs:', error);
      setError('Failed to load token packs');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pack: TokenPack) => {
    try {
      setPurchasing(pack.sku);
      setError(null);

      const res = await fetch('/api/tokens/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_sku: pack.sku }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Checkout failed');
      }

      const { checkout_url } = await res.json();
      
      // Redirect to Stripe Checkout
      window.location.href = checkout_url;

    } catch (error) {
      console.error('Purchase error:', error);
      setError(error instanceof Error ? error.message : 'Purchase failed');
      setPurchasing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      
      <div className="relative bg-zinc-900 rounded-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/30 flex items-center justify-center">
              <Coins className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Buy Tokens</h2>
              <p className="text-sm text-gray-400">For messages, tips & more</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {packs.map((pack) => (
                <button
                  key={pack.sku}
                  onClick={() => handlePurchase(pack)}
                  disabled={purchasing !== null}
                  className={`w-full p-4 rounded-xl border transition relative ${
                    pack.is_best_value
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-white/10 bg-zinc-800 hover:border-white/20'
                  } ${purchasing === pack.sku ? 'opacity-75' : ''}`}
                >
                  {pack.is_best_value && (
                    <span className="absolute -top-2 left-4 px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      BEST VALUE
                    </span>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-bold text-lg">{pack.name}</p>
                      {pack.description && (
                        <p className="text-sm text-gray-400">{pack.description}</p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xl font-bold text-yellow-400">
                        {formatPenceAsGbp(pack.price_minor)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(pack.price_minor / pack.tokens * 100).toFixed(1)}p per token
                      </p>
                    </div>
                  </div>

                  {purchasing === pack.sku && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
          )}

          {/* Info */}
          <div className="mt-6 p-3 bg-white/5 rounded-lg text-xs text-gray-400">
            <p>Tokens are used for extra messages, tips, and unlocking content.</p>
            <p className="mt-1">Payments are processed securely via Stripe.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

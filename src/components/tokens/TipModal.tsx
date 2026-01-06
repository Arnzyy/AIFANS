'use client';

import { useState, useEffect } from 'react';
import { X, Heart, Coins, Loader2, Check } from 'lucide-react';
import { formatTokensAsGbp } from '@/lib/tokens/types';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  threadId?: string;
  chatMode?: 'nsfw' | 'sfw';
  currentBalance: number;
  onSuccess?: (newBalance: number) => void;
  onInsufficientBalance?: () => void;
}

interface TipConfig {
  presets: number[];
  min_tokens: number;
  max_tokens: number;
  tokens_per_gbp: number;
}

export function TipModal({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  threadId,
  chatMode = 'nsfw',
  currentBalance,
  onSuccess,
  onInsufficientBalance,
}: TipModalProps) {
  const [config, setConfig] = useState<TipConfig | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      setSelectedAmount(null);
      setCustomAmount('');
      setSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/tips');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        // Pre-select middle preset
        if (data.presets.length > 0) {
          setSelectedAmount(data.presets[Math.floor(data.presets.length / 2)]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tip config:', error);
    }
  };

  const getFinalAmount = (): number => {
    if (customAmount) {
      return parseInt(customAmount) || 0;
    }
    return selectedAmount || 0;
  };

  const handleSendTip = async () => {
    const amount = getFinalAmount();

    if (!amount || amount <= 0) {
      setError('Please select a tip amount');
      return;
    }

    if (amount > currentBalance) {
      setError('Insufficient tokens');
      onInsufficientBalance?.();
      return;
    }

    if (config && amount < config.min_tokens) {
      setError(`Minimum tip is ${config.min_tokens} tokens`);
      return;
    }

    if (config && amount > config.max_tokens) {
      setError(`Maximum tip is ${config.max_tokens} tokens`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creatorId,
          amount_tokens: amount,
          thread_id: threadId,
          chat_mode: chatMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes('Insufficient')) {
          onInsufficientBalance?.();
        }
        throw new Error(data.error || 'Tip failed');
      }

      setSuccess(true);
      onSuccess?.(data.new_balance);

      // Close after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Tip failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const amount = getFinalAmount();
  const canAfford = amount <= currentBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div className="relative bg-zinc-900 rounded-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500/20 to-red-500/20 p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-pink-500/30 flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Send a Tip</h2>
              <p className="text-sm text-gray-400">to {creatorName}</p>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="px-6 py-3 bg-white/5 flex items-center justify-between">
          <span className="text-sm text-gray-400">Your balance</span>
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="font-medium">{currentBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-lg font-bold">Tip Sent!</p>
              <p className="text-gray-400">{creatorName} will love it 💕</p>
            </div>
          ) : (
            <>
              {/* Presets */}
              {config && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {config.presets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setSelectedAmount(preset);
                        setCustomAmount('');
                      }}
                      className={`p-3 rounded-lg border transition ${
                        selectedAmount === preset && !customAmount
                          ? 'border-pink-500 bg-pink-500/10'
                          : 'border-white/10 bg-zinc-800 hover:border-white/20'
                      }`}
                    >
                      <p className="font-bold">{preset}</p>
                      <p className="text-xs text-gray-400">
                        {formatTokensAsGbp(preset, config.tokens_per_gbp)}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Custom Amount */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Or enter custom amount
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    placeholder="Enter tokens"
                    min={config?.min_tokens || 50}
                    max={config?.max_tokens || 25000}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Summary */}
              {amount > 0 && (
                <div className="p-3 bg-white/5 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Tip amount</span>
                    <span className="font-bold">{amount.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">≈ GBP</span>
                    <span className="text-gray-400">
                      {formatTokensAsGbp(amount, config?.tokens_per_gbp)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && <p className="text-sm text-red-400 mb-4 text-center">{error}</p>}

              {/* Send Button */}
              <button
                onClick={handleSendTip}
                disabled={loading || amount <= 0 || !canAfford}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition ${
                  canAfford && amount > 0
                    ? 'bg-gradient-to-r from-pink-500 to-red-500 hover:opacity-90'
                    : 'bg-white/10 text-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Heart className="w-5 h-5" />
                    {!canAfford && amount > 0
                      ? 'Insufficient Balance'
                      : `Send ${amount > 0 ? amount.toLocaleString() : ''} Tokens`}
                  </>
                )}
              </button>

              {/* Info */}
              <p className="mt-4 text-xs text-gray-500 text-center">
                Platform takes 30% fee. Creator receives 70% of tip amount.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

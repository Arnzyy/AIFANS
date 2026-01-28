// =====================================================
// BUY MESSAGES MODAL
// Allows users to purchase extra messages with tokens
// =====================================================

'use client';

import { useState } from 'react';
import { X, Zap, Check } from 'lucide-react';

interface MessagePack {
  messages: number;
  tokens: number;
  label: string;
  discount?: string;
}

const MESSAGE_PACKS: MessagePack[] = [
  { messages: 10, tokens: 100, label: '10 messages' },
  { messages: 50, tokens: 450, label: '50 messages', discount: '10% off' },
  { messages: 100, tokens: 800, label: '100 messages', discount: '20% off' },
];

interface BuyMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  tokenBalance: number;
  onPurchaseSuccess: (messagesAdded: number, newBalance: number) => void;
}

export function BuyMessagesModal({
  isOpen,
  onClose,
  creatorId,
  tokenBalance,
  onPurchaseSuccess,
}: BuyMessagesModalProps) {
  const [selectedPack, setSelectedPack] = useState<MessagePack | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!selectedPack) return;

    if (tokenBalance < selectedPack.tokens) {
      setError('Insufficient tokens. Please add more to your wallet.');
      return;
    }

    setPurchasing(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/${creatorId}/buy-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: selectedPack.messages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      // Success!
      onPurchaseSuccess(data.messages_purchased, data.new_balance);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-zinc-900 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Buy More Messages</h2>
            <p className="text-sm text-gray-400 mt-1">
              Continue your conversation with extra messages
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Token Balance */}
        <div className="px-6 py-4 bg-purple-500/10 border-b border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Your Token Balance</span>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-lg">{tokenBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Message Packs */}
        <div className="p-6 space-y-3">
          {MESSAGE_PACKS.map((pack) => {
            const canAfford = tokenBalance >= pack.tokens;
            const isSelected = selectedPack?.messages === pack.messages;

            return (
              <button
                key={pack.messages}
                onClick={() => setSelectedPack(pack)}
                disabled={!canAfford}
                className={`w-full p-4 rounded-xl border-2 transition text-left ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/20'
                    : canAfford
                    ? 'border-white/10 hover:border-white/20 bg-white/5'
                    : 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{pack.messages} Messages</span>
                      {pack.discount && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                          {pack.discount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-sm text-gray-400">
                        {pack.tokens.toLocaleString()} tokens
                      </span>
                    </div>
                  </div>

                  {/* Checkmark */}
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 pb-4">
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={!selectedPack || purchasing}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purchasing ? 'Processing...' : 'Purchase'}
          </button>
        </div>

        {/* Need More Tokens Link */}
        {selectedPack && tokenBalance < selectedPack.tokens && (
          <div className="px-6 pb-6 pt-0">
            <a
              href="/wallet?add=true"
              className="block text-center text-sm text-purple-400 hover:text-purple-300 transition"
            >
              Add more tokens to your wallet →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

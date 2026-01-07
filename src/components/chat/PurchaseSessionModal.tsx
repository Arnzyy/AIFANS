'use client';

import { useState } from 'react';
import { X, Coins, MessageCircle, Check, AlertCircle, Loader2 } from 'lucide-react';
import { CHAT_CONFIG, formatTokensAsGbp, type MessagePack } from '@/lib/chat/config';

// ===========================================
// TYPES
// ===========================================

interface PurchaseSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (pack: MessagePack) => Promise<void>;
  tokenBalance: number;
  modelName?: string;
  isLoading?: boolean;
  error?: string | null;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function PurchaseSessionModal({
  isOpen,
  onClose,
  onPurchase,
  tokenBalance,
  modelName,
  isLoading = false,
  error = null,
}: PurchaseSessionModalProps) {
  const [selectedPack, setSelectedPack] = useState<MessagePack | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!selectedPack) return;
    await onPurchase(selectedPack);
  };

  const canAfford = (pack: MessagePack) => tokenBalance >= pack.tokens;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 rounded-2xl max-w-md w-full shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">Start Chatting</h2>
            {modelName && (
              <p className="text-sm text-gray-400">Chat with {modelName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Balance display */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-gray-300">Your balance</span>
            </div>
            <span className="font-semibold text-white">
              {tokenBalance.toLocaleString()} tokens
            </span>
          </div>

          {/* Pack options */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Select a message pack:</p>

            {CHAT_CONFIG.session_message_packs.map((pack, idx) => {
              const affordable = canAfford(pack);
              const isSelected = selectedPack?.messages === pack.messages;

              return (
                <button
                  key={pack.messages}
                  onClick={() => affordable && setSelectedPack(pack)}
                  disabled={!affordable || isLoading}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10'
                      : affordable
                        ? 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                        : 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-500'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-purple-400" />
                        <span className="font-medium text-white">
                          {pack.messages} messages
                        </span>
                        {idx === 0 && (
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                            Try it
                          </span>
                        )}
                        {idx === CHAT_CONFIG.session_message_packs.length - 1 && (
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                            Best value
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{pack.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">
                      {pack.tokens.toLocaleString()} tokens
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatTokensAsGbp(pack.tokens)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Insufficient balance warning */}
          {selectedPack && !canAfford(selectedPack) && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">
                Insufficient balance. You need {selectedPack.tokens - tokenBalance} more tokens.
              </span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          {/* Info text */}
          <p className="text-xs text-gray-500 text-center">
            Messages don&apos;t expire. Chat at your own pace.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <button
            onClick={handlePurchase}
            disabled={!selectedPack || isLoading || (selectedPack && !canAfford(selectedPack))}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Purchasing...
              </>
            ) : selectedPack ? (
              <>
                Purchase {selectedPack.messages} messages
              </>
            ) : (
              'Select a pack'
            )}
          </button>

          {/* Top up link */}
          {selectedPack && !canAfford(selectedPack) && (
            <a
              href="/wallet"
              className="block text-center text-sm text-purple-400 hover:text-purple-300 transition"
            >
              Top up your wallet
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default PurchaseSessionModal;

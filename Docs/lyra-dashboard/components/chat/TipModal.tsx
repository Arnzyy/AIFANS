'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Heart,
  X,
  Sparkles,
  Coins,
  Gift,
  ChevronRight,
  Loader2,
  Check,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { formatTokensAsGbp, DEFAULT_TOKEN_CONFIG } from '@/lib/tokens/types';

// ===========================================
// TYPES
// ===========================================

interface TipPreset {
  tokens: number;
  label: string;
  popular?: boolean;
}

interface TipButtonProps {
  creatorName: string;
  creatorId: string;
  threadId?: string;
  chatMode: 'nsfw' | 'sfw';
  userBalance: number;
  onTipSent: (amount: number, tipId: string) => void;
  onBuyTokens: () => void;
}

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  creatorId: string;
  threadId?: string;
  chatMode: 'nsfw' | 'sfw';
  userBalance: number;
  onTipSent: (amount: number, tipId: string) => void;
  onBuyTokens: () => void;
}

// ===========================================
// TIP PRESETS
// ===========================================

const TIP_PRESETS: TipPreset[] = [
  { tokens: 250, label: '£1' },
  { tokens: 500, label: '£2' },
  { tokens: 1250, label: '£5', popular: true },
  { tokens: 2500, label: '£10' },
];

// ===========================================
// TIP BUTTON (In Chat Header/Footer)
// ===========================================

export function TipButton({
  creatorName,
  creatorId,
  threadId,
  chatMode,
  userBalance,
  onTipSent,
  onBuyTokens,
}: TipButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg text-white font-medium text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-pink-500/25"
      >
        <Gift className="w-4 h-4" />
        <span>Tip</span>
      </button>

      <TipModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        creatorName={creatorName}
        creatorId={creatorId}
        threadId={threadId}
        chatMode={chatMode}
        userBalance={userBalance}
        onTipSent={onTipSent}
        onBuyTokens={onBuyTokens}
      />
    </>
  );
}

// ===========================================
// TIP MODAL
// ===========================================

export function TipModal({
  isOpen,
  onClose,
  creatorName,
  creatorId,
  threadId,
  chatMode,
  userBalance,
  onTipSent,
  onBuyTokens,
}: TipModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<TipPreset | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);
  
  const customInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(null);
      setCustomAmount('');
      setIsCustomMode(false);
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  // Focus custom input when switching to custom mode
  useEffect(() => {
    if (isCustomMode && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomMode]);

  if (!isOpen) return null;

  const getTipAmount = (): number => {
    if (isCustomMode && customAmount) {
      return parseInt(customAmount) || 0;
    }
    return selectedPreset?.tokens || 0;
  };

  const tipAmount = getTipAmount();
  const canAfford = tipAmount > 0 && tipAmount <= userBalance;
  const isValidAmount = tipAmount >= DEFAULT_TOKEN_CONFIG.min_tip_tokens;

  const handleSendTip = async () => {
    if (!canAfford || !isValidAmount || sending) return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creatorId,
          amount_tokens: tipAmount,
          thread_id: threadId,
          chat_mode: chatMode,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error_message || 'Failed to send tip');
      }

      // Show success animation
      setSentAmount(tipAmount);
      setShowSuccess(true);

      // Trigger callback after animation
      setTimeout(() => {
        onTipSent(tipAmount, data.tip_id);
        onClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to send tip');
    } finally {
      setSending(false);
    }
  };

  // Success Animation View
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80" />
        <div className="relative">
          <TipSuccessAnimation amount={sentAmount} creatorName={creatorName} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      
      <div className="relative bg-zinc-900 rounded-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-pink-500/20 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Send a Tip</h2>
              <p className="text-gray-400 text-sm">Show appreciation to {creatorName}</p>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="px-6 mb-4">
          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Your Balance</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="font-bold">{userBalance.toLocaleString()} tokens</span>
            </div>
          </div>
        </div>

        {/* Preset Amounts */}
        <div className="px-6 mb-4">
          <p className="text-sm font-medium mb-3 text-gray-300">Quick amounts</p>
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS.map((preset) => (
              <button
                key={preset.tokens}
                onClick={() => {
                  setSelectedPreset(preset);
                  setIsCustomMode(false);
                  setCustomAmount('');
                }}
                disabled={preset.tokens > userBalance}
                className={`relative p-3 rounded-xl border-2 transition-all ${
                  selectedPreset?.tokens === preset.tokens && !isCustomMode
                    ? 'border-pink-500 bg-pink-500/20 scale-105'
                    : preset.tokens > userBalance
                    ? 'border-white/5 bg-zinc-800/50 opacity-50 cursor-not-allowed'
                    : 'border-white/10 bg-zinc-800 hover:border-white/20 hover:scale-105'
                }`}
              >
                {preset.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold bg-pink-500 text-white rounded-full">
                    Popular
                  </span>
                )}
                <p className="text-lg font-bold">{preset.label}</p>
                <p className="text-xs text-gray-400">{preset.tokens} tokens</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="px-6 mb-6">
          <button
            onClick={() => {
              setIsCustomMode(true);
              setSelectedPreset(null);
            }}
            className={`w-full p-4 rounded-xl border-2 transition-all ${
              isCustomMode
                ? 'border-pink-500 bg-pink-500/20'
                : 'border-white/10 bg-zinc-800 hover:border-white/20'
            }`}
          >
            {isCustomMode ? (
              <div className="flex items-center gap-3">
                <Coins className="w-5 h-5 text-yellow-500" />
                <input
                  ref={customInputRef}
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter tokens"
                  min={DEFAULT_TOKEN_CONFIG.min_tip_tokens}
                  max={userBalance}
                  className="flex-1 bg-transparent outline-none text-lg font-bold placeholder:text-gray-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-sm text-gray-400">
                  {customAmount ? formatTokensAsGbp(parseInt(customAmount) || 0) : ''}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Custom amount</span>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
            )}
          </button>
          
          {isCustomMode && customAmount && parseInt(customAmount) < DEFAULT_TOKEN_CONFIG.min_tip_tokens && (
            <p className="text-xs text-yellow-500 mt-2">
              Minimum tip is {DEFAULT_TOKEN_CONFIG.min_tip_tokens} tokens
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 mb-4">
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/10 bg-zinc-900/80">
          {tipAmount > userBalance ? (
            <button
              onClick={onBuyTokens}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Coins className="w-5 h-5" />
              Buy More Tokens
            </button>
          ) : (
            <button
              onClick={handleSendTip}
              disabled={!canAfford || !isValidAmount || sending}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : tipAmount > 0 ? (
                <>
                  <Heart className="w-5 h-5" />
                  Send {tipAmount.toLocaleString()} tokens ({formatTokensAsGbp(tipAmount)})
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5" />
                  Select an amount
                </>
              )}
            </button>
          )}
          
          <p className="text-center text-xs text-gray-500 mt-3">
            Tips are voluntary and appreciated ✨
          </p>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// TIP SUCCESS ANIMATION
// ===========================================

function TipSuccessAnimation({ amount, creatorName }: { amount: number; creatorName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center animate-fade-in">
      {/* Floating hearts animation */}
      <div className="relative w-32 h-32 mb-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float-heart"
            style={{
              left: `${50 + Math.sin(i * 45 * Math.PI / 180) * 40}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
          </div>
        ))}
        
        {/* Center checkmark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center animate-scale-bounce">
            <Check className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>
      
      {/* Success text */}
      <h3 className="text-2xl font-bold mb-2 animate-slide-up">Tip Sent!</h3>
      <p className="text-gray-400 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        You sent <span className="text-pink-400 font-bold">{amount.toLocaleString()} tokens</span>
      </p>
      <p className="text-gray-500 text-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {creatorName} will love it 💕
      </p>
      
      {/* Sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <Sparkles
            key={i}
            className="absolute w-4 h-4 text-yellow-400 animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ===========================================
// TIP RECEIVED INDICATOR (In Chat)
// ===========================================

export function TipReceivedBubble({ amount, timestamp }: { amount: number; timestamp: string }) {
  return (
    <div className="flex justify-center my-4">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-full animate-tip-received">
        <Gift className="w-4 h-4 text-pink-400" />
        <span className="text-sm font-medium text-pink-300">
          You sent a tip of {amount.toLocaleString()} tokens
        </span>
        <Heart className="w-4 h-4 text-pink-400 fill-pink-400 animate-pulse" />
      </div>
    </div>
  );
}

// ===========================================
// COMPACT TIP BUTTON (Inline in chat input)
// ===========================================

export function CompactTipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 transition-colors"
      title="Send a tip"
    >
      <Gift className="w-5 h-5" />
    </button>
  );
}

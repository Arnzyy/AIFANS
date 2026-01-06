'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { TipModal } from './TipModal';

interface TipButtonProps {
  creatorId: string;
  creatorName: string;
  threadId?: string;
  chatMode?: 'nsfw' | 'sfw';
  variant?: 'icon' | 'button' | 'small' | 'custom';
  className?: string;
  onTipSent?: (newBalance: number) => void;
}

export function TipButton({
  creatorId,
  creatorName,
  threadId,
  chatMode = 'nsfw',
  variant = 'button',
  className = '',
  onTipSent,
}: TipButtonProps) {
  const [showTipModal, setShowTipModal] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/wallet');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
        setBalanceLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const handleClick = async () => {
    if (!balanceLoaded) {
      await fetchBalance();
    }
    setShowTipModal(true);
  };

  const handleSuccess = (newBalance: number) => {
    setBalance(newBalance);
    onTipSent?.(newBalance);
  };

  const handleInsufficientBalance = () => {
    // Redirect to buy tokens page
    window.location.href = '/wallet?add=true';
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`p-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 transition ${className}`}
          title="Send a tip"
        >
          <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
        </button>

        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          creatorId={creatorId}
          creatorName={creatorName}
          threadId={threadId}
          chatMode={chatMode}
          currentBalance={balance}
          onSuccess={handleSuccess}
          onInsufficientBalance={handleInsufficientBalance}
        />
      </>
    );
  }

  if (variant === 'small') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg flex items-center gap-1.5 transition ${className}`}
        >
          <Heart className="w-4 h-4 text-pink-400" />
          <span className="text-sm text-pink-400 font-medium">Tip</span>
        </button>

        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          creatorId={creatorId}
          creatorName={creatorName}
          threadId={threadId}
          chatMode={chatMode}
          currentBalance={balance}
          onSuccess={handleSuccess}
          onInsufficientBalance={handleInsufficientBalance}
        />
      </>
    );
  }

  if (variant === 'custom') {
    return (
      <>
        <button
          onClick={handleClick}
          data-tip-button
          className={`px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/40 rounded-lg flex items-center gap-1.5 transition ${className}`}
        >
          <span className="text-sm text-purple-300 font-medium">Custom</span>
        </button>

        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          creatorId={creatorId}
          creatorName={creatorName}
          threadId={threadId}
          chatMode={chatMode}
          currentBalance={balance}
          onSuccess={handleSuccess}
          onInsufficientBalance={handleInsufficientBalance}
        />
      </>
    );
  }

  // Default button variant
  return (
    <>
      <button
        onClick={handleClick}
        className={`px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 hover:opacity-90 rounded-lg flex items-center gap-2 font-medium transition ${className}`}
      >
        <Heart className="w-5 h-5" />
        Send Tip
      </button>

      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        creatorId={creatorId}
        creatorName={creatorName}
        threadId={threadId}
        chatMode={chatMode}
        currentBalance={balance}
        onSuccess={handleSuccess}
        onInsufficientBalance={handleInsufficientBalance}
      />
    </>
  );
}

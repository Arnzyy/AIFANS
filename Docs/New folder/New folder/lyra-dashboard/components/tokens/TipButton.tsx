'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { TipModal } from './TipModal';
import { BuyTokensModal } from './BuyTokensModal';

interface TipButtonProps {
  creatorId: string;
  creatorName: string;
  threadId?: string;
  chatMode?: 'nsfw' | 'sfw';
  variant?: 'icon' | 'button' | 'small';
  className?: string;
}

export function TipButton({
  creatorId,
  creatorName,
  threadId,
  chatMode = 'nsfw',
  variant = 'button',
  className = '',
}: TipButtonProps) {
  const [showTipModal, setShowTipModal] = useState(false);
  const [showBuyTokens, setShowBuyTokens] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/wallet');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
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
    // Optionally trigger a chat refresh to show acknowledgement
  };

  const handleInsufficientBalance = () => {
    setShowTipModal(false);
    setShowBuyTokens(true);
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`p-2 rounded-lg hover:bg-pink-500/20 transition ${className}`}
          title="Send a tip"
        >
          <Heart className="w-5 h-5 text-pink-400" />
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

        <BuyTokensModal
          isOpen={showBuyTokens}
          onClose={() => {
            setShowBuyTokens(false);
            fetchBalance();
          }}
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

        <BuyTokensModal
          isOpen={showBuyTokens}
          onClose={() => {
            setShowBuyTokens(false);
            fetchBalance();
          }}
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

      <BuyTokensModal
        isOpen={showBuyTokens}
        onClose={() => {
          setShowBuyTokens(false);
          fetchBalance();
        }}
      />
    </>
  );
}

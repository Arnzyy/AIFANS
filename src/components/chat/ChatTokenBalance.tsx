'use client';

import { Coins, Plus } from 'lucide-react';
import Link from 'next/link';

// ===========================================
// TYPES
// ===========================================

interface ChatTokenBalanceProps {
  balance: number;
  showTopUp?: boolean;
  compact?: boolean;
  className?: string;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function ChatTokenBalance({
  balance,
  showTopUp = true,
  compact = false,
  className = '',
}: ChatTokenBalanceProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Coins className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-white">
          {balance.toLocaleString()}
        </span>
        {showTopUp && (
          <Link
            href="/wallet"
            className="p-1 rounded-full hover:bg-white/10 transition"
            title="Top up tokens"
          >
            <Plus className="w-3 h-3 text-gray-400" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
        <Coins className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-white">
          {balance.toLocaleString()} tokens
        </span>
      </div>
      {showTopUp && (
        <Link
          href="/wallet"
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition"
        >
          <Plus className="w-4 h-4" />
          Top up
        </Link>
      )}
    </div>
  );
}

// ===========================================
// INLINE BALANCE (for chat header)
// ===========================================

interface InlineTokenBalanceProps {
  balance: number;
  className?: string;
}

export function InlineTokenBalance({ balance, className = '' }: InlineTokenBalanceProps) {
  return (
    <Link
      href="/wallet"
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-full transition ${className}`}
    >
      <Coins className="w-3.5 h-3.5 text-yellow-500" />
      <span className="text-xs font-medium text-gray-300">
        {balance.toLocaleString()}
      </span>
    </Link>
  );
}

// ===========================================
// MESSAGE COST PREVIEW
// ===========================================

interface MessageCostPreviewProps {
  cost: number;
  balance: number;
  className?: string;
}

export function MessageCostPreview({ cost, balance, className = '' }: MessageCostPreviewProps) {
  const canAfford = balance >= cost;

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <span className="text-gray-500">Cost:</span>
      <span className={canAfford ? 'text-gray-300' : 'text-red-400'}>
        {cost} tokens
      </span>
      {!canAfford && (
        <Link href="/wallet" className="text-purple-400 hover:text-purple-300">
          Top up
        </Link>
      )}
    </div>
  );
}

export default ChatTokenBalance;

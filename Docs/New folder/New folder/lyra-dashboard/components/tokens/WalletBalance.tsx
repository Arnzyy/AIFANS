'use client';

import { useState, useEffect } from 'react';
import { Coins, Plus, ChevronDown } from 'lucide-react';
import { formatTokensAsGbp } from '@/lib/tokens/types';

interface WalletBalanceProps {
  balance?: number;
  onBuyTokens?: () => void;
  compact?: boolean;
}

export function WalletBalance({ balance: initialBalance, onBuyTokens, compact = false }: WalletBalanceProps) {
  const [balance, setBalance] = useState(initialBalance ?? 0);
  const [loading, setLoading] = useState(initialBalance === undefined);

  useEffect(() => {
    if (initialBalance === undefined) {
      fetchBalance();
    }
  }, [initialBalance]);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/wallet');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={onBuyTokens}
        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition"
      >
        <Coins className="w-4 h-4 text-yellow-400" />
        <span className="font-medium text-yellow-400">
          {loading ? '...' : balance.toLocaleString()}
        </span>
        <Plus className="w-3 h-3 text-yellow-400" />
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span className="text-sm text-gray-400">Token Balance</span>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : balance.toLocaleString()}
          </p>
          <p className="text-sm text-gray-400">
            ≈ {formatTokensAsGbp(balance)}
          </p>
        </div>
        
        <button
          onClick={onBuyTokens}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          Buy Tokens
        </button>
      </div>
    </div>
  );
}

// Inline balance for header/nav
export function InlineWalletBalance({ onBuyTokens }: { onBuyTokens?: () => void }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/wallet');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  return (
    <button
      onClick={onBuyTokens}
      className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg transition"
      title="Buy Tokens"
    >
      <Coins className="w-4 h-4 text-yellow-400" />
      <span className="text-sm font-medium text-yellow-400">
        {balance === null ? '...' : balance.toLocaleString()}
      </span>
    </button>
  );
}

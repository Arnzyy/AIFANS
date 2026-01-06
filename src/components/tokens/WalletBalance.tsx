'use client';

import { useState, useEffect } from 'react';
import { Wallet, Coins, Plus, Loader2 } from 'lucide-react';
import { formatTokensAsGbp } from '@/lib/tokens/types';

interface WalletBalanceProps {
  onBuyTokens?: () => void;
  compact?: boolean;
}

interface WalletData {
  balance: number;
  lifetime_purchased: number;
  lifetime_spent: number;
}

export function WalletBalance({ onBuyTokens, compact = false }: WalletBalanceProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/wallet');
      if (res.ok) {
        const data = await res.json();
        setWallet(data);
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6 text-center text-gray-400">
        Failed to load wallet
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={onBuyTokens}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition"
      >
        <Coins className="w-4 h-4 text-yellow-400" />
        <span className="font-medium">{wallet.balance.toLocaleString()}</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Token Balance</p>
            <p className="text-3xl font-bold">{wallet.balance.toLocaleString()}</p>
            <p className="text-xs text-gray-500">
              ≈ {formatTokensAsGbp(wallet.balance)}
            </p>
          </div>
        </div>

        {onBuyTokens && (
          <button
            onClick={onBuyTokens}
            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 rounded-lg font-medium flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Buy Tokens
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
        <div>
          <p className="text-xs text-gray-500 mb-1">Lifetime Purchased</p>
          <p className="text-lg font-bold text-green-400">
            {wallet.lifetime_purchased.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Lifetime Spent</p>
          <p className="text-lg font-bold text-purple-400">
            {wallet.lifetime_spent.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  MessageCircle,
  Heart,
  Package,
  RotateCcw,
  Loader2,
  Gift,
} from 'lucide-react';
import { TokenLedgerEntry, TokenLedgerReason, formatTokensAsGbp } from '@/lib/tokens/types';

interface TransactionHistoryProps {
  limit?: number;
  showLoadMore?: boolean;
}

const REASON_LABELS: Record<TokenLedgerReason, { label: string; icon: typeof Coins }> = {
  PACK_PURCHASE: { label: 'Token Purchase', icon: Package },
  EXTRA_MESSAGE: { label: 'Extra Message', icon: MessageCircle },
  TIP: { label: 'Tip', icon: Heart },
  REFUND: { label: 'Refund', icon: RotateCcw },
  ADJUSTMENT: { label: 'Adjustment', icon: Coins },
  PROMO_CREDIT: { label: 'Promo Credit', icon: Gift },
  PPV_UNLOCK: { label: 'Content Unlock', icon: Package },
};

export function TransactionHistory({ limit = 20, showLoadMore = true }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<TokenLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    fetchTransactions(0);
  }, []);

  const fetchTransactions = async (newOffset: number) => {
    try {
      const isInitial = newOffset === 0;
      isInitial ? setLoading(true) : setLoadingMore(true);

      const res = await fetch(`/api/wallet/transactions?limit=${limit}&offset=${newOffset}`);
      if (res.ok) {
        const data = await res.json();
        
        if (isInitial) {
          setTransactions(data.transactions);
        } else {
          setTransactions((prev) => [...prev, ...data.transactions]);
        }
        
        setHasMore(data.transactions.length === limit);
        setOffset(newOffset + data.transactions.length);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchTransactions(offset);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <Coins className="w-12 h-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">No transactions yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {transactions.map((tx) => {
          const isCredit = tx.type === 'CREDIT';
          const reasonInfo = REASON_LABELS[tx.reason] || { label: tx.reason, icon: Coins };
          const Icon = reasonInfo.icon;

          return (
            <div
              key={tx.id}
              className="flex items-center gap-4 p-3 bg-zinc-900 rounded-lg"
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isCredit ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isCredit ? 'text-green-400' : 'text-red-400'}`}
                />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {tx.description || reasonInfo.label}
                </p>
                <p className="text-sm text-gray-500">{formatDate(tx.created_at)}</p>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p
                  className={`font-bold ${
                    isCredit ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isCredit ? '+' : '-'}{tx.amount_tokens.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Balance: {tx.balance_after.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {showLoadMore && hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full mt-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-400 transition"
        >
          {loadingMore ? (
            <Loader2 className="w-4 h-4 mx-auto animate-spin" />
          ) : (
            'Load More'
          )}
        </button>
      )}
    </div>
  );
}

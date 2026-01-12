'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Loader2, Package, Heart, MessageCircle, RefreshCw, Unlock } from 'lucide-react';
import { TokenLedgerEntry, formatTokensAsGbp } from '@/lib/tokens/types';
import { formatDistanceToNow } from 'date-fns';

interface TransactionHistoryProps {
  limit?: number;
}

export function TransactionHistory({ limit = 20 }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<TokenLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`/api/wallet/transactions?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'PACK_PURCHASE':
      case 'PROMO_CREDIT':
        return Package;
      case 'TIP':
        return Heart;
      case 'EXTRA_MESSAGE':
        return MessageCircle;
      case 'REFUND':
      case 'ADJUSTMENT':
        return RefreshCw;
      case 'PPV_UNLOCK':
        return Unlock;
      default:
        return Package;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'PACK_PURCHASE':
        return 'Token Purchase';
      case 'EXTRA_MESSAGE':
        return 'Extra Message';
      case 'TIP':
        return 'Tip Sent';
      case 'REFUND':
        return 'Refund';
      case 'ADJUSTMENT':
        return 'Adjustment';
      case 'PROMO_CREDIT':
        return 'Promo Credit';
      case 'PPV_UNLOCK':
        return 'Content Unlocked';
      default:
        return reason;
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl p-8 text-center text-gray-400">
        <p>No transactions yet</p>
        <p className="text-sm mt-1">Your transaction history will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl divide-y divide-white/10">
      {transactions.map((tx) => {
        const Icon = getReasonIcon(tx.reason);
        const isCredit = tx.type === 'CREDIT';

        return (
          <div key={tx.id} className="p-4 hover:bg-white/5 transition">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isCredit ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                {isCredit ? (
                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-red-400" />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <p className="font-medium">{getReasonLabel(tx.reason)}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                </p>
                {tx.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{tx.description}</p>
                )}
              </div>

              {/* Amount */}
              <div className="text-right">
                <p
                  className={`text-lg font-bold ${
                    isCredit ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isCredit ? '+' : '-'}
                  {tx.amount_tokens.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  Balance: {tx.balance_after.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

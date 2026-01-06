'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  Coins,
  Plus,
  X,
  Sparkles,
  Check,
  Loader2,
  ExternalLink,
  History,
  ChevronRight,
  TrendingUp,
  Gift,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import {
  TokenPack,
  TokenLedgerEntry,
  formatTokensAsGbp,
  formatPenceAsGbp,
  DEFAULT_TOKEN_CONFIG,
} from '@/lib/tokens/types';

// ===========================================
// WALLET BALANCE DISPLAY (Chat Header)
// ===========================================

interface WalletBalanceProps {
  balance: number;
  onBuyTokens: () => void;
  compact?: boolean;
}

export function WalletBalance({ balance, onBuyTokens, compact = false }: WalletBalanceProps) {
  if (compact) {
    return (
      <button
        onClick={onBuyTokens}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition group"
        title="Token balance - Click to buy more"
      >
        <Coins className="w-4 h-4 text-yellow-500" />
        <span className="font-medium">{balance.toLocaleString()}</span>
        <Plus className="w-3 h-3 text-gray-500 group-hover:text-white transition" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-xl">
      <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
        <Coins className="w-5 h-5 text-yellow-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-400">Token Balance</p>
        <p className="text-lg font-bold">{balance.toLocaleString()}</p>
      </div>
      <button
        onClick={onBuyTokens}
        className="px-3 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg text-sm font-medium hover:opacity-90 transition flex items-center gap-1"
      >
        <Plus className="w-4 h-4" />
        Buy
      </button>
    </div>
  );
}

// ===========================================
// BUY TOKENS MODAL
// ===========================================

interface BuyTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onPurchaseComplete?: (newBalance: number) => void;
}

export function BuyTokensModal({
  isOpen,
  onClose,
  currentBalance,
  onPurchaseComplete,
}: BuyTokensModalProps) {
  const [packs, setPacks] = useState<TokenPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<TokenPack | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTokenPacks();
    }
  }, [isOpen]);

  const fetchTokenPacks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tokens/packs');
      const data = await response.json();
      setPacks(data.packs || []);
    } catch (err) {
      console.error('Failed to fetch token packs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPack || purchasing) return;

    setPurchasing(true);
    try {
      const response = await fetch('/api/tokens/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pack_sku: selectedPack.sku,
          success_url: `${window.location.origin}/tokens/success`,
          cancel_url: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setPurchasing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      
      <div className="relative bg-zinc-900 rounded-2xl max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-yellow-500/20 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Coins className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Buy Tokens</h2>
              <p className="text-gray-400 text-sm">
                Current balance: {currentBalance.toLocaleString()} tokens
              </p>
            </div>
          </div>
        </div>

        {/* Token Packs */}
        <div className="p-6 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {packs.map((pack) => (
                <button
                  key={pack.sku}
                  onClick={() => setSelectedPack(pack)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPack?.sku === pack.sku
                      ? 'border-yellow-500 bg-yellow-500/10 scale-[1.02]'
                      : 'border-white/10 bg-zinc-800 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <Coins className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{pack.tokens.toLocaleString()} tokens</p>
                          {pack.is_best_value && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500 text-black rounded-full">
                              Best Value
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {formatPenceAsGbp(pack.price_minor)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-500">
                        {formatPenceAsGbp(pack.price_minor)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(pack.price_minor / pack.tokens * 100).toFixed(2)}p/token
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-white/10 bg-zinc-900/80">
          <button
            onClick={handlePurchase}
            disabled={!selectedPack || purchasing}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purchasing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirecting to checkout...
              </>
            ) : selectedPack ? (
              <>
                <Sparkles className="w-5 h-5" />
                Buy {selectedPack.tokens.toLocaleString()} tokens
                <ExternalLink className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                <Coins className="w-5 h-5" />
                Select a pack
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-gray-500 mt-3">
            Secure payment via Stripe
          </p>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// TRANSACTION HISTORY
// ===========================================

interface TransactionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionHistory({ isOpen, onClose }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<TokenLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tokens/history');
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'PACK_PURCHASE':
        return <Plus className="w-4 h-4 text-green-400" />;
      case 'TIP':
        return <Gift className="w-4 h-4 text-pink-400" />;
      case 'EXTRA_MESSAGE':
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case 'REFUND':
        return <RefreshCw className="w-4 h-4 text-yellow-400" />;
      default:
        return <Coins className="w-4 h-4 text-gray-400" />;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'PACK_PURCHASE':
        return 'Token Purchase';
      case 'TIP':
        return 'Tip Sent';
      case 'EXTRA_MESSAGE':
        return 'Extra Message';
      case 'REFUND':
        return 'Refund';
      case 'PROMO_CREDIT':
        return 'Promotional Credit';
      default:
        return reason;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      
      <div className="relative bg-zinc-900 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-gray-400" />
            <h2 className="text-xl font-bold">Transaction History</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transactions List */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                    {getReasonIcon(tx.reason)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{getReasonLabel(tx.reason)}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      tx.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount_tokens.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Balance: {tx.balance_after.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// LOW BALANCE WARNING
// ===========================================

interface LowBalanceWarningProps {
  balance: number;
  requiredAmount: number;
  onBuyTokens: () => void;
  onDismiss: () => void;
}

export function LowBalanceWarning({
  balance,
  requiredAmount,
  onBuyTokens,
  onDismiss,
}: LowBalanceWarningProps) {
  const shortfall = requiredAmount - balance;

  return (
    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <Wallet className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-yellow-300">Insufficient Tokens</h4>
          <p className="text-sm text-yellow-200/80 mt-1">
            You need {requiredAmount.toLocaleString()} tokens but only have {balance.toLocaleString()}.
            You're short by <span className="font-bold">{shortfall.toLocaleString()} tokens</span>.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onBuyTokens}
              className="px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-medium hover:bg-yellow-400 transition"
            >
              Buy Tokens
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Wallet, CreditCard, Plus, History, Coins, Check, AlertCircle } from 'lucide-react';
import { WalletBalance } from '@/components/tokens/WalletBalance';
import { BuyTokensModal } from '@/components/tokens/BuyTokensModal';
import { TransactionHistory } from '@/components/tokens/TransactionHistory';

export default function WalletPage() {
  const searchParams = useSearchParams();
  const [showBuyTokens, setShowBuyTokens] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'success' | 'cancelled' | null>(null);

  // Check for purchase status from URL params
  useEffect(() => {
    const purchase = searchParams?.get('purchase');
    if (purchase === 'success') {
      setPurchaseStatus('success');
      // Clear URL params
      window.history.replaceState({}, '', '/wallet');
    } else if (purchase === 'cancelled') {
      setPurchaseStatus('cancelled');
      window.history.replaceState({}, '', '/wallet');
    }
  }, [searchParams]);

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-gray-400 mt-1">Manage your tokens and payment methods</p>
      </div>

      {/* Purchase Status Alerts */}
      {purchaseStatus === 'success' && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400" />
          <div>
            <p className="font-medium text-green-300">Purchase Successful!</p>
            <p className="text-sm text-green-200/80">Your tokens have been added to your wallet.</p>
          </div>
        </div>
      )}

      {purchaseStatus === 'cancelled' && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="font-medium text-yellow-300">Purchase Cancelled</p>
            <p className="text-sm text-yellow-200/80">Your purchase was cancelled. No charges were made.</p>
          </div>
        </div>
      )}

      {/* Token Balance */}
      <div className="mb-6">
        <WalletBalance onBuyTokens={() => setShowBuyTokens(true)} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setShowBuyTokens(true)}
          className="p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition text-left"
        >
          <Coins className="w-6 h-6 text-yellow-400 mb-2" />
          <p className="font-medium">Buy Tokens</p>
          <p className="text-sm text-gray-400">For messages & tips</p>
        </button>
        <button
          onClick={() => setShowAddCard(true)}
          className="p-4 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition text-left"
        >
          <CreditCard className="w-6 h-6 text-purple-400 mb-2" />
          <p className="font-medium">Payment Methods</p>
          <p className="text-sm text-gray-400">Manage cards</p>
        </button>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          Transaction History
        </h2>
        <TransactionHistory limit={10} />
      </div>

      {/* Buy Tokens Modal */}
      <BuyTokensModal
        isOpen={showBuyTokens}
        onClose={() => setShowBuyTokens(false)}
      />

      {/* Add Card Modal (placeholder - Stripe handles this) */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowAddCard(false)} />
          <div className="relative bg-zinc-900 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Payment Methods</h2>
            <p className="text-gray-400 mb-4">
              Payment methods are securely managed by Stripe during checkout.
              You don't need to add a card in advance.
            </p>
            <button
              onClick={() => setShowAddCard(false)}
              className="w-full py-2.5 bg-white/10 rounded-lg font-medium hover:bg-white/20 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

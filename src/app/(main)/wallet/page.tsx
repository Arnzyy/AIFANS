'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showAddFunds = searchParams.get('add') === 'true';
  const returnUrl = searchParams.get('return');

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [addAmount, setAddAmount] = useState('10');
  const [addingFunds, setAddingFunds] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/wallet');
        return;
      }

      // Get or create wallet
      let { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!walletData) {
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert({ user_id: user.id, balance: 0 })
          .select()
          .single();
        walletData = newWallet;
      }

      setWallet(walletData);

      // Get recent transactions
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          creator:profiles!wallet_transactions_creator_id_fkey(
            username, display_name, avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setTransactions(txData || []);

    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async () => {
    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount < 5) {
      return;
    }

    setAddingFunds(true);

    try {
      // In production, this would redirect to CCBill payment page
      // For now, simulate adding funds (development only)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // This would be handled by webhook in production
      await supabase
        .from('wallets')
        .update({ balance: (wallet?.balance || 0) + Math.round(amount * 100) })
        .eq('user_id', user.id);

      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount: Math.round(amount * 100),
        description: 'Added funds'
      });

      // Refresh
      await loadWallet();

      if (returnUrl) {
        router.push(returnUrl);
      }

    } catch (error) {
      console.error('Error adding funds:', error);
    } finally {
      setAddingFunds(false);
    }
  };

  const presetAmounts = [5, 10, 20, 50, 100];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-gray-400 mt-1">Manage your balance for tips and AI chat</p>
      </div>

      {/* Balance Card */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-6">
        <p className="text-sm text-gray-400">Available Balance</p>
        <p className="text-4xl font-bold mt-2">
          £{((wallet?.balance || 0) / 100).toFixed(2)}
        </p>
      </div>

      {/* Add Funds Section */}
      <div className="p-6 rounded-xl bg-white/5 border border-white/10 mb-6">
        <h2 className="text-lg font-semibold mb-4">Add Funds</h2>

        {/* Preset amounts */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {presetAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => setAddAmount(amount.toString())}
              className={`py-2 rounded-lg transition-colors ${
                addAmount === amount.toString()
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              £{amount}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">£</span>
            <input
              type="number"
              min="5"
              step="1"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleAddFunds}
            disabled={addingFunds || parseFloat(addAmount) < 5}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {addingFunds ? 'Processing...' : 'Add Funds'}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">Minimum £5.00</p>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Transaction History</h2>

        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {tx.type === 'deposit' && '💳'}
                    {tx.type === 'tip' && '💰'}
                    {tx.type === 'ai_chat' && '🤖'}
                    {tx.type === 'ppv' && '🔒'}
                    {tx.type === 'refund' && '↩️'}
                  </span>
                  <div>
                    <p className="font-medium capitalize">
                      {tx.type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {tx.creator?.display_name || tx.creator?.username || tx.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}£{(Math.abs(tx.amount) / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl bg-white/5 border border-white/10">
            <div className="text-4xl mb-3">💳</div>
            <p className="text-gray-400">No transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    }>
      <WalletContent />
    </Suspense>
  );
}

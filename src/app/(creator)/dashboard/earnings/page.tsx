import { createServerClient } from '@/lib/supabase/server';

export default async function EarningsPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  // Get all transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('creator_id', user?.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  // Calculate stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const thisMonthTransactions = transactions?.filter(t => 
    new Date(t.created_at) >= startOfMonth
  ) || [];

  const lastMonthTransactions = transactions?.filter(t => {
    const date = new Date(t.created_at);
    return date >= startOfLastMonth && date <= endOfLastMonth;
  }) || [];

  const thisMonthTotal = thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  const lastMonthTotal = lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  const allTimeTotal = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

  const percentChange = lastMonthTotal > 0 
    ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : 0;

  // Group by type
  const subscriptionEarnings = thisMonthTransactions
    .filter(t => t.type === 'subscription')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const tipsEarnings = thisMonthTransactions
    .filter(t => t.type === 'tip')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const ppvEarnings = thisMonthTransactions
    .filter(t => t.type === 'ppv')
    .reduce((sum, t) => sum + t.amount, 0);

  const chatEarnings = thisMonthTransactions
    .filter(t => t.type === 'ai_chat')
    .reduce((sum, t) => sum + t.amount, 0);

  // Get pending payout
  const { data: pendingPayout } = await supabase
    .from('payouts')
    .select('amount')
    .eq('creator_id', user?.id)
    .eq('status', 'pending')
    .single();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-gray-400 mt-1">Track your revenue</p>
      </div>

      {/* Main stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <p className="text-sm text-gray-400">This Month</p>
          <p className="text-3xl font-bold mt-2">£{(thisMonthTotal / 100).toFixed(2)}</p>
          <p className={`text-sm mt-2 ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {percentChange >= 0 ? '↑' : '↓'} {Math.abs(percentChange)}% from last month
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-gray-400">All Time</p>
          <p className="text-3xl font-bold mt-2">£{(allTimeTotal / 100).toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-2">{transactions?.length || 0} transactions</p>
        </div>

        <div className="p-6 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-gray-400">Available for Payout</p>
          <p className="text-3xl font-bold mt-2">
            £{((pendingPayout?.amount || thisMonthTotal) / 100).toFixed(2)}
          </p>
          <button className="mt-3 px-4 py-1.5 text-sm bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors">
            Request Payout
          </button>
        </div>
      </div>

      {/* Breakdown */}
      <div className="p-6 rounded-xl bg-white/5 border border-white/10">
        <h2 className="text-lg font-semibold mb-4">This Month Breakdown</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">💳</span>
              <span>Subscriptions</span>
            </div>
            <span className="font-medium">£{(subscriptionEarnings / 100).toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">💰</span>
              <span>Tips</span>
            </div>
            <span className="font-medium">£{(tipsEarnings / 100).toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔒</span>
              <span>PPV Sales</span>
            </div>
            <span className="font-medium">£{(ppvEarnings / 100).toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🤖</span>
              <span>AI Chat</span>
            </div>
            <span className="font-medium">£{(chatEarnings / 100).toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-gray-400">Platform fee (20%)</span>
          <span className="text-gray-500">-£{(thisMonthTotal * 0.2 / 100).toFixed(2)}</span>
        </div>
        
        <div className="mt-2 flex items-center justify-between font-semibold">
          <span>Net earnings</span>
          <span className="text-green-400">£{(thisMonthTotal * 0.8 / 100).toFixed(2)}</span>
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        
        {transactions && transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.slice(0, 20).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {tx.type === 'subscription' && '💳'}
                    {tx.type === 'tip' && '💰'}
                    {tx.type === 'ppv' && '🔒'}
                    {tx.type === 'ai_chat' && '🤖'}
                    {tx.type === 'message' && '💬'}
                  </span>
                  <div>
                    <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="font-medium text-green-400">
                  +£{(tx.amount / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl bg-white/5 border border-white/10">
            <div className="text-4xl mb-3">💸</div>
            <p className="text-gray-400">No transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

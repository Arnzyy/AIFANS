'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'TOKEN_PURCHASE' | 'SUBSCRIPTION' | 'TIP' | 'PPV_PURCHASE' | 'PAYOUT' | 'REFUND';
  user_email: string;
  creator_name?: string;
  amount_gbp: number;
  tokens?: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  stripe_payment_id?: string;
  created_at: string;
  description?: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTransactions();
  }, [page, typeFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(typeFilter !== 'ALL' && { type: typeFilter }),
      });
      const response = await fetch(`/api/admin/transactions?${params}`);
      const data = await response.json();
      setTransactions(data.transactions || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.user_email.toLowerCase().includes(query) ||
      t.creator_name?.toLowerCase().includes(query) ||
      t.stripe_payment_id?.toLowerCase().includes(query)
    );
  });

  const formatCurrency = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { icon: any; color: string; label: string }> = {
      TOKEN_PURCHASE: { icon: DollarSign, color: 'text-green-400 bg-green-500/20', label: 'Token Purchase' },
      SUBSCRIPTION: { icon: CreditCard, color: 'text-blue-400 bg-blue-500/20', label: 'Subscription' },
      TIP: { icon: ArrowUpRight, color: 'text-pink-400 bg-pink-500/20', label: 'Tip' },
      PPV_PURCHASE: { icon: DollarSign, color: 'text-yellow-400 bg-yellow-500/20', label: 'PPV Purchase' },
      PAYOUT: { icon: ArrowDownLeft, color: 'text-purple-400 bg-purple-500/20', label: 'Payout' },
      REFUND: { icon: RefreshCw, color: 'text-red-400 bg-red-500/20', label: 'Refund' },
    };
    return configs[type] || { icon: CreditCard, color: 'text-gray-400 bg-gray-500/20', label: type };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-gray-400">View all platform transactions</p>
        </div>
        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by email, creator, or payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg"
        >
          <option value="ALL">All Types</option>
          <option value="TOKEN_PURCHASE">Token Purchases</option>
          <option value="SUBSCRIPTION">Subscriptions</option>
          <option value="TIP">Tips</option>
          <option value="PPV_PURCHASE">PPV Purchases</option>
          <option value="PAYOUT">Payouts</option>
          <option value="REFUND">Refunds</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-800 text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Type</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">User</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Creator</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Amount</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Tokens</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Date</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Stripe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.map((tx) => {
                const typeConfig = getTypeConfig(tx.type);
                const Icon = typeConfig.icon;
                return (
                  <tr key={tx.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs ${typeConfig.color}`}>
                        <Icon className="w-3 h-3" />
                        {typeConfig.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{tx.user_email}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{tx.creator_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={tx.type === 'REFUND' || tx.type === 'PAYOUT' ? 'text-red-400' : 'text-green-400'}>
                        {tx.type === 'REFUND' || tx.type === 'PAYOUT' ? '-' : '+'}{formatCurrency(tx.amount_gbp)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{tx.tokens?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tx.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                        tx.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                        tx.status === 'REFUNDED' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {tx.stripe_payment_id && (
                        <a
                          href={`https://dashboard.stripe.com/payments/${tx.stripe_payment_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:underline flex items-center gap-1 text-xs"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

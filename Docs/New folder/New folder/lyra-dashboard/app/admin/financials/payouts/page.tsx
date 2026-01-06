'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  Check,
  X,
  Loader2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  CreditCard,
} from 'lucide-react';

interface Payout {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  amount_gbp_minor: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  requested_at: string;
  processed_at?: string;
  stripe_transfer_id?: string;
  failure_reason?: string;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);

  useEffect(() => {
    fetchPayouts();
  }, [page, statusFilter]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      });
      const response = await fetch(`/api/admin/payouts?${params}`);
      const data = await response.json();
      setPayouts(data.payouts || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (payoutId: string) => {
    setProcessing(payoutId);
    try {
      await fetch(`/api/admin/payouts/${payoutId}/process`, { method: 'POST' });
      fetchPayouts();
    } catch (err) {
      console.error('Failed to process payout');
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessBatch = async () => {
    if (selectedPayouts.length === 0) return;
    setProcessing('batch');
    try {
      await fetch('/api/admin/payouts/process-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_ids: selectedPayouts }),
      });
      setSelectedPayouts([]);
      fetchPayouts();
    } catch (err) {
      console.error('Failed to process batch');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectPayout = async (payoutId: string, reason: string) => {
    try {
      await fetch(`/api/admin/payouts/${payoutId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      fetchPayouts();
    } catch (err) {
      console.error('Failed to reject payout');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedPayouts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPayouts.length === payouts.filter((p) => p.status === 'PENDING').length) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(payouts.filter((p) => p.status === 'PENDING').map((p) => p.id));
    }
  };

  const formatCurrency = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  const pendingPayouts = payouts.filter((p) => p.status === 'PENDING');
  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + p.amount_gbp_minor, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payout Management</h1>
          <p className="text-gray-400">Process and manage creator payouts</p>
        </div>
        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Summary */}
      {statusFilter === 'PENDING' && pendingPayouts.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-400">
                  {pendingPayouts.length} pending payout{pendingPayouts.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-400">Total: {formatCurrency(totalPendingAmount)}</p>
              </div>
            </div>
            <button
              onClick={handleProcessBatch}
              disabled={selectedPayouts.length === 0 || processing === 'batch'}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {processing === 'batch' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Process Selected ({selectedPayouts.length})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg"
        >
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No payouts found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-800 text-left">
              <tr>
                {statusFilter === 'PENDING' && (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedPayouts.length === pendingPayouts.length && pendingPayouts.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Creator</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Amount</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Requested</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Processed</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-white/5">
                  {statusFilter === 'PENDING' && (
                    <td className="px-4 py-3">
                      {payout.status === 'PENDING' && (
                        <input
                          type="checkbox"
                          checked={selectedPayouts.includes(payout.id)}
                          onChange={() => toggleSelect(payout.id)}
                          className="w-4 h-4 rounded"
                        />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{payout.creator_name}</p>
                      <p className="text-sm text-gray-500">{payout.creator_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-green-400">{formatCurrency(payout.amount_gbp_minor)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payout.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(payout.requested_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {payout.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleProcessPayout(payout.id)}
                          disabled={processing === payout.id}
                          className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded"
                        >
                          {processing === payout.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Rejection reason:');
                            if (reason) handleRejectPayout(payout.id, reason);
                          }}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {payout.status === 'FAILED' && payout.failure_reason && (
                      <span className="text-xs text-red-400">{payout.failure_reason}</span>
                    )}
                  </td>
                </tr>
              ))}
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

function StatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
    PROCESSING: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Loader2 },
    COMPLETED: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
    FAILED: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
  }[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: AlertCircle };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bg} ${config.text}`}>
      <Icon className={`w-3 h-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
      {status}
    </span>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface Creator {
  id: string;
  user_id: string;
  display_name: string;
  business_type: string;
  country: string;
  status: string;
  stripe_onboarding_complete: boolean;
  onboarding_complete: boolean;
  created_at: string;
  profile?: {
    username: string;
    email: string;
    display_name?: string;
  };
}

interface PaginatedResponse {
  data: Creator[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number }> }> = {
  pending: { label: 'Pending', color: 'text-yellow-400 bg-yellow-500/20', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-400 bg-green-500/20', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-500/20', icon: XCircle },
  suspended: { label: 'Suspended', color: 'text-orange-400 bg-orange-500/20', icon: AlertCircle },
};

export default function AdminCreatorsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [creators, setCreators] = useState<Creator[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedResponse, 'data'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const status = searchParams.get('status') || 'pending';
  const page = parseInt(searchParams.get('page') || '1');

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/creators?status=${status}&page=${page}`);
      const data: PaginatedResponse = await res.json();

      setCreators(data.data);
      setPagination({
        total: data.total,
        page: data.page,
        per_page: data.per_page,
        total_pages: data.total_pages,
      });
    } catch (error) {
      console.error('Error fetching creators:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, [status, page]);

  const handleApprove = async (creatorId: string) => {
    if (!confirm('Approve this creator application?')) return;

    setActionLoading(creatorId);
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchCreators();
      }
    } catch (error) {
      console.error('Error approving creator:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (creatorId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setActionLoading(creatorId);
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        fetchCreators();
      }
    } catch (error) {
      console.error('Error rejecting creator:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const setStatus = (newStatus: string) => {
    router.push(`/admin/creators?status=${newStatus}`);
  };

  const setPage = (newPage: number) => {
    router.push(`/admin/creators?status=${status}&page=${newPage}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Creator Applications</h1>
        <p className="text-zinc-400 mt-1">Review and manage creator applications</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`
              px-4 py-2 rounded-lg capitalize transition-colors
              ${status === s
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800'
              }
            `}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Creators Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400">Loading...</div>
        ) : creators.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            No {status === 'all' ? '' : status} creators found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Creator</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Country</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Stripe</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Applied</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {creators.map((creator) => {
                const statusInfo = statusConfig[creator.status] || statusConfig.pending;
                const StatusIcon = statusInfo.icon;

                return (
                  <tr key={creator.id} className="hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{creator.display_name}</p>
                        <p className="text-sm text-zinc-400">
                          {creator.profile?.email || creator.profile?.username}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm capitalize">
                      {creator.business_type}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {creator.country}
                    </td>
                    <td className="px-6 py-4">
                      {creator.stripe_onboarding_complete ? (
                        <span className="text-green-400 text-sm">Complete</span>
                      ) : (
                        <span className="text-zinc-500 text-sm">Incomplete</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${statusInfo.color}`}>
                        <StatusIcon size={12} />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {new Date(creator.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/creators/${creator.id}`}
                          className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye size={18} />
                        </Link>

                        {creator.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(creator.id)}
                              disabled={actionLoading === creator.id}
                              className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(creator.id)}
                              disabled={actionLoading === creator.id}
                              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Showing {(pagination.page - 1) * pagination.per_page + 1} to{' '}
            {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
            {pagination.total} creators
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-2 bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= pagination.total_pages}
              className="p-2 bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

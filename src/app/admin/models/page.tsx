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
  FileText,
} from 'lucide-react';

interface Model {
  id: string;
  creator_id: string;
  name: string;
  age: number;
  avatar_url?: string;
  status: string;
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  subscription_price: number;
  created_at: string;
  creator?: {
    display_name: string;
    avatar_url?: string;
    user_id: string;
  };
}

interface PaginatedResponse {
  data: Model[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'text-zinc-400 bg-zinc-500/20', icon: FileText },
  pending_review: { label: 'Pending Review', color: 'text-yellow-400 bg-yellow-500/20', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-400 bg-green-500/20', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-500/20', icon: XCircle },
  suspended: { label: 'Suspended', color: 'text-orange-400 bg-orange-500/20', icon: XCircle },
} as const;

export default function AdminModelsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [models, setModels] = useState<Model[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedResponse, 'data'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const status = searchParams.get('status') || 'pending_review';
  const page = parseInt(searchParams.get('page') || '1');

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/models?status=${status}&page=${page}`);
      const data: PaginatedResponse = await res.json();

      setModels(data.data);
      setPagination({
        total: data.total,
        page: data.page,
        per_page: data.per_page,
        total_pages: data.total_pages,
      });
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [status, page]);

  const handleApprove = async (modelId: string) => {
    if (!confirm('Approve this model?')) return;

    setActionLoading(modelId);
    try {
      const res = await fetch(`/api/admin/models/${modelId}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        fetchModels();
      }
    } catch (error) {
      console.error('Error approving model:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (modelId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setActionLoading(modelId);
    try {
      const res = await fetch(`/api/admin/models/${modelId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        fetchModels();
      }
    } catch (error) {
      console.error('Error rejecting model:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const setStatus = (newStatus: string) => {
    router.push(`/admin/models?status=${newStatus}`);
  };

  const setPage = (newPage: number) => {
    router.push(`/admin/models?status=${status}&page=${newPage}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Model Review</h1>
        <p className="text-zinc-400 mt-1">Review and approve AI model personas</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {['pending_review', 'approved', 'rejected', 'draft', 'all'].map((s) => (
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
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-4 animate-pulse">
              <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto mb-4" />
              <div className="h-4 bg-zinc-800 rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      ) : models.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-12 text-center text-zinc-400">
          No {status === 'all' ? '' : status.replace('_', ' ')} models found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => {
            const statusInfo = statusConfig[model.status as keyof typeof statusConfig] || statusConfig.draft;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={model.id}
                className="bg-zinc-900 rounded-xl overflow-hidden"
              >
                <div className="p-6">
                  {/* Avatar */}
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                    {model.avatar_url ? (
                      <img
                        src={model.avatar_url}
                        alt={model.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">
                        {model.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-lg">{model.name}</h3>
                    <p className="text-sm text-zinc-400">Age: {model.age}</p>
                    <p className="text-sm text-zinc-500 mt-1">
                      by {model.creator?.display_name}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex justify-center gap-2 mb-4">
                    {model.nsfw_enabled && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                        NSFW
                      </span>
                    )}
                    {model.sfw_enabled && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                        SFW
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex justify-center mb-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${statusInfo.color}`}>
                      <StatusIcon size={12} />
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Price */}
                  <p className="text-center text-sm text-zinc-400">
                    £{(model.subscription_price / 100).toFixed(2)}/month
                  </p>
                </div>

                {/* Actions */}
                <div className="border-t border-zinc-800 p-4 flex justify-center gap-2">
                  <Link
                    href={`/admin/models/${model.id}`}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    title="View details"
                  >
                    <Eye size={18} />
                  </Link>

                  {model.status === 'pending_review' && (
                    <>
                      <button
                        onClick={() => handleApprove(model.id)}
                        disabled={actionLoading === model.id}
                        className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                        title="Approve"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => handleReject(model.id)}
                        disabled={actionLoading === model.id}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                        title="Reject"
                      >
                        <X size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Showing {(pagination.page - 1) * pagination.per_page + 1} to{' '}
            {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
            {pagination.total} models
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

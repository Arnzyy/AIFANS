'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Mail,
  Calendar,
  DollarSign,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import { Creator, getStatusColor, getStatusLabel, formatGBP } from '@/lib/creators/types';

export default function AllCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  useEffect(() => {
    fetchCreators();
  }, [page, statusFilter]);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      });
      const response = await fetch(`/api/admin/creators?${params}`);
      const data = await response.json();
      setCreators(data.creators || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch creators');
    } finally {
      setLoading(false);
    }
  };

  const filteredCreators = creators.filter((creator) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      creator.legal_name?.toLowerCase().includes(query) ||
      creator.business_name?.toLowerCase().includes(query) ||
      creator.contact_email?.toLowerCase().includes(query)
    );
  });

  const handleSuspend = async (creatorId: string) => {
    if (!confirm('Are you sure you want to suspend this creator?')) return;
    try {
      await fetch(`/api/admin/creators/${creatorId}/suspend`, { method: 'POST' });
      fetchCreators();
      setSelectedCreator(null);
    } catch (err) {
      console.error('Failed to suspend creator');
    }
  };

  const handleUnsuspend = async (creatorId: string) => {
    try {
      await fetch(`/api/admin/creators/${creatorId}/unsuspend`, { method: 'POST' });
      fetchCreators();
      setSelectedCreator(null);
    } catch (err) {
      console.error('Failed to unsuspend creator');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Creators</h1>
          <p className="text-gray-400">Manage creator accounts and approvals</p>
        </div>
        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">All Status</option>
          <option value="INCOMPLETE">Incomplete</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No creators found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-800 text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Creator</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Type</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Models</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Earnings</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Joined</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCreators.map((creator) => (
                <tr key={creator.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{creator.legal_name || creator.business_name || 'Unnamed'}</p>
                      <p className="text-sm text-gray-500">{creator.contact_email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-zinc-800 rounded text-xs">{creator.account_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(creator.status)}`}>
                      {getStatusLabel(creator.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{creator.max_models_allowed}</td>
                  <td className="px-4 py-3 text-sm">—</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(creator.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedCreator(creator)}
                      className="p-2 hover:bg-white/10 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
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
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
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

      {/* Creator Detail Modal */}
      {selectedCreator && (
        <CreatorDetailModal
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
          onSuspend={() => handleSuspend(selectedCreator.id)}
          onUnsuspend={() => handleUnsuspend(selectedCreator.id)}
        />
      )}
    </div>
  );
}

function CreatorDetailModal({
  creator,
  onClose,
  onSuspend,
  onUnsuspend,
}: {
  creator: Creator;
  onClose: () => void;
  onSuspend: () => void;
  onUnsuspend: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{creator.legal_name || creator.business_name}</h2>
              <p className="text-gray-400">{creator.contact_email}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(creator.status)}`}>
              {getStatusLabel(creator.status)}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoCard icon={Users} label="Account Type" value={creator.account_type} />
            <InfoCard icon={Calendar} label="Joined" value={new Date(creator.created_at).toLocaleDateString()} />
            <InfoCard icon={Bot} label="Max Models" value={creator.max_models_allowed.toString()} />
            <InfoCard icon={DollarSign} label="Trust Level" value={creator.trust_level.toString()} />
          </div>

          {/* Contact */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <h3 className="font-medium mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p>{creator.contact_email || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p>{creator.contact_phone || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Address</p>
                <p>
                  {[creator.address_line1, creator.city, creator.postal_code, creator.country_code]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Stripe Status */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <h3 className="font-medium mb-3">Stripe Connect</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Account ID</span>
                <span className="font-mono text-xs">{creator.stripe_connect_account_id || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Onboarding Complete</span>
                <span className={creator.stripe_connect_onboarding_complete ? 'text-green-400' : 'text-red-400'}>
                  {creator.stripe_connect_onboarding_complete ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Payouts Enabled</span>
                <span className={creator.stripe_payouts_enabled ? 'text-green-400' : 'text-red-400'}>
                  {creator.stripe_payouts_enabled ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          {creator.admin_notes && (
            <div className="bg-zinc-800 rounded-lg p-4">
              <h3 className="font-medium mb-2">Admin Notes</h3>
              <p className="text-sm text-gray-400">{creator.admin_notes}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {creator.rejection_reason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h3 className="font-medium text-red-400 mb-2">Rejection Reason</h3>
              <p className="text-sm">{creator.rejection_reason}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
            Close
          </button>
          <Link
            href={`/admin/creators/${creator.id}`}
            className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-center"
          >
            Full Profile
          </Link>
          {creator.status === 'SUSPENDED' ? (
            <button onClick={onUnsuspend} className="flex-1 py-2 bg-green-500 hover:bg-green-600 rounded-lg">
              Unsuspend
            </button>
          ) : creator.status === 'APPROVED' ? (
            <button onClick={onSuspend} className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg">
              Suspend
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-zinc-800 rounded-lg p-3 flex items-center gap-3">
      <Icon className="w-5 h-5 text-gray-500" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

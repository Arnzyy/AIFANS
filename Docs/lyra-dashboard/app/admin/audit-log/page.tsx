'use client';

import { useState, useEffect } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  User,
  Shield,
  Bot,
  Flag,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Eye,
  Settings,
  Clock,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    fetchAuditLog();
  }, [page, actionFilter]);

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(actionFilter !== 'ALL' && { action: actionFilter }),
      });
      const response = await fetch(`/api/admin/audit-log?${params}`);
      const data = await response.json();
      setEntries(data.entries || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch audit log');
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.actor_email.toLowerCase().includes(query) ||
      entry.action.toLowerCase().includes(query) ||
      entry.entity_id.toLowerCase().includes(query)
    );
  });

  const getActionConfig = (action: string) => {
    const configs: Record<string, { icon: any; color: string; label: string }> = {
      CREATOR_APPROVED: { icon: Check, color: 'text-green-400', label: 'Creator Approved' },
      CREATOR_REJECTED: { icon: X, color: 'text-red-400', label: 'Creator Rejected' },
      CREATOR_SUSPENDED: { icon: AlertTriangle, color: 'text-orange-400', label: 'Creator Suspended' },
      MODEL_APPROVED: { icon: Check, color: 'text-green-400', label: 'Model Approved' },
      MODEL_REJECTED: { icon: X, color: 'text-red-400', label: 'Model Rejected' },
      MODEL_SUSPENDED: { icon: AlertTriangle, color: 'text-orange-400', label: 'Model Suspended' },
      REPORT_RESOLVED: { icon: Flag, color: 'text-blue-400', label: 'Report Resolved' },
      STRIKE_ISSUED: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Strike Issued' },
      STRIKE_REMOVED: { icon: Check, color: 'text-green-400', label: 'Strike Removed' },
      PAYOUT_PROCESSED: { icon: DollarSign, color: 'text-green-400', label: 'Payout Processed' },
      PAYOUT_REJECTED: { icon: X, color: 'text-red-400', label: 'Payout Rejected' },
      USER_BANNED: { icon: X, color: 'text-red-400', label: 'User Banned' },
      USER_UNBANNED: { icon: Check, color: 'text-green-400', label: 'User Unbanned' },
      ROLE_CHANGED: { icon: Shield, color: 'text-purple-400', label: 'Role Changed' },
      SETTINGS_UPDATED: { icon: Settings, color: 'text-blue-400', label: 'Settings Updated' },
      LOGIN: { icon: User, color: 'text-gray-400', label: 'Admin Login' },
    };
    return configs[action] || { icon: Eye, color: 'text-gray-400', label: action };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-gray-400">Complete history of all admin actions</p>
        </div>
        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <div>
            <p className="font-medium text-blue-400">Immutable Audit Trail</p>
            <p className="text-sm text-gray-400">
              All admin actions are permanently logged and cannot be deleted or modified.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by email, action, or entity ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg"
        >
          <option value="ALL">All Actions</option>
          <option value="CREATOR_APPROVED">Creator Approved</option>
          <option value="CREATOR_REJECTED">Creator Rejected</option>
          <option value="MODEL_APPROVED">Model Approved</option>
          <option value="MODEL_REJECTED">Model Rejected</option>
          <option value="REPORT_RESOLVED">Report Resolved</option>
          <option value="STRIKE_ISSUED">Strike Issued</option>
          <option value="PAYOUT_PROCESSED">Payout Processed</option>
          <option value="USER_BANNED">User Banned</option>
          <option value="ROLE_CHANGED">Role Changed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No audit log entries found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-800 text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Timestamp</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Action</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Actor</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Entity</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">IP Address</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEntries.map((entry) => {
                const actionConfig = getActionConfig(entry.action);
                const Icon = actionConfig.icon;
                return (
                  <tr key={entry.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-2 ${actionConfig.color}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{actionConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm">{entry.actor_email}</p>
                        <p className="text-xs text-gray-500">{entry.actor_role}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-400">{entry.entity_type}</p>
                        <p className="text-xs text-gray-500 font-mono">{entry.entity_id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{entry.ip_address || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="p-2 hover:bg-white/10 rounded-lg"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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

      {/* Detail Modal */}
      {selectedEntry && (
        <AuditDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}

function AuditDetailModal({ entry, onClose }: { entry: AuditLogEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">Audit Log Details</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Action</p>
              <p className="font-medium">{entry.action}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Timestamp</p>
              <p className="font-medium">{new Date(entry.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Actor</p>
              <p className="font-medium">{entry.actor_email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Role</p>
              <p className="font-medium">{entry.actor_role}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Entity Type</p>
              <p className="font-medium">{entry.entity_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Entity ID</p>
              <p className="font-medium font-mono text-xs">{entry.entity_id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">IP Address</p>
              <p className="font-medium">{entry.ip_address || '—'}</p>
            </div>
          </div>

          {entry.details && Object.keys(entry.details).length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Details</p>
              <pre className="p-3 bg-zinc-800 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </div>
          )}

          {entry.user_agent && (
            <div>
              <p className="text-xs text-gray-500 mb-1">User Agent</p>
              <p className="text-xs text-gray-400 break-all">{entry.user_agent}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10">
          <button onClick={onClose} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

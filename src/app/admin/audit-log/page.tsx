'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ScrollText,
  User,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

const actionConfig = {
  approve_creator: { label: 'Approved Creator', color: 'text-green-400', icon: CheckCircle },
  reject_creator: { label: 'Rejected Creator', color: 'text-red-400', icon: XCircle },
  approve_model: { label: 'Approved Model', color: 'text-green-400', icon: CheckCircle },
  reject_model: { label: 'Rejected Model', color: 'text-red-400', icon: XCircle },
  suspend_creator: { label: 'Suspended Creator', color: 'text-orange-400', icon: AlertTriangle },
  issue_strike: { label: 'Issued Strike', color: 'text-yellow-400', icon: AlertTriangle },
  resolve_report: { label: 'Resolved Report', color: 'text-blue-400', icon: ScrollText },
} as const;

export default function AdminAuditLogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const page = parseInt(searchParams.get('page') || '1');
  const action = searchParams.get('action') || '';

  useEffect(() => {
    const fetchAuditLog = async () => {
      setLoading(true);
      try {
        // TODO: Implement actual API call
        // For now, show placeholder
        setEntries([]);
        setTotal(0);
      } catch (error) {
        console.error('Error fetching audit log:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLog();
  }, [page, action]);

  const setPage = (newPage: number) => {
    router.push(`/admin/audit-log?page=${newPage}${action ? `&action=${action}` : ''}`);
  };

  const setAction = (newAction: string) => {
    router.push(`/admin/audit-log${newAction ? `?action=${newAction}` : ''}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-zinc-400 mt-1">View all admin actions and system events</p>
      </div>

      {/* Filter by Action */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setAction('')}
          className={`
            px-4 py-2 rounded-lg transition-colors
            ${!action ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}
          `}
        >
          All Actions
        </button>
        {Object.entries(actionConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setAction(key)}
            className={`
              px-4 py-2 rounded-lg transition-colors
              ${action === key ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}
            `}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">No audit log entries found</p>
            <p className="text-zinc-500 text-sm mt-2">Admin actions will be logged here</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Action</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Target</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Admin</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Details</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {entries.map((entry) => {
                const config = actionConfig[entry.action as keyof typeof actionConfig] || {
                  label: entry.action,
                  color: 'text-zinc-400',
                  icon: ScrollText,
                };
                const ActionIcon = config.icon;

                return (
                  <tr key={entry.id} className="hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 ${config.color}`}>
                        <ActionIcon size={16} />
                        <span className="font-medium">{config.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="capitalize">{entry.target_type}</span>
                      <span className="text-zinc-500 ml-1">
                        #{entry.target_id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {entry.admin_id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 max-w-xs truncate">
                      {JSON.stringify(entry.details)}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Page {page} of {Math.ceil(total / 50)}
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
              disabled={page >= Math.ceil(total / 50)}
              className="p-2 bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h3 className="font-medium mb-2">About the Audit Log</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• All admin actions are recorded and cannot be deleted</li>
          <li>• Entries include IP address and user agent for security</li>
          <li>• Use filters to find specific types of actions</li>
          <li>• Contact technical support for data export requests</li>
        </ul>
      </div>
    </div>
  );
}

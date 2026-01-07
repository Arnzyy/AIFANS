'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number }> }> = {
  pending: { label: 'Pending', color: 'text-yellow-400 bg-yellow-500/20', icon: Clock },
  investigating: { label: 'Investigating', color: 'text-blue-400 bg-blue-500/20', icon: AlertTriangle },
  resolved: { label: 'Resolved', color: 'text-green-400 bg-green-500/20', icon: CheckCircle },
  dismissed: { label: 'Dismissed', color: 'text-zinc-400 bg-zinc-500/20', icon: XCircle },
};

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  impersonation: 'Impersonation',
  underage_content: 'Underage Content',
  non_consensual: 'Non-Consensual',
  illegal_content: 'Illegal Content',
  other: 'Other',
};

export default function AdminReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const status = searchParams.get('status') || 'pending';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        // TODO: Implement actual API call
        // For now, show placeholder
        setReports([]);
        setTotal(0);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [status, page]);

  const setStatus = (newStatus: string) => {
    router.push(`/admin/reports?status=${newStatus}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Reports</h1>
        <p className="text-zinc-400 mt-1">Review and handle user reports</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {['pending', 'investigating', 'resolved', 'dismissed', 'all'].map((s) => (
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

      {/* Reports Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-400">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400">No {status === 'all' ? '' : status} reports found</p>
            <p className="text-zinc-500 text-sm mt-2">Reports will appear here when users flag content</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Report</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Target</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Reason</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Date</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {reports.map((report) => {
                const statusInfo = statusConfig[report.status] || statusConfig.pending;
                const StatusIcon = statusInfo.icon;

                return (
                  <tr key={report.id} className="hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm">Report #{report.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4 text-sm capitalize">
                      {report.target_type}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {reasonLabels[report.reason] || report.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${statusInfo.color}`}>
                        <StatusIcon size={12} />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h3 className="font-medium mb-2">Report Handling Guidelines</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• Review reported content carefully before taking action</li>
          <li>• Underage content reports must be escalated immediately</li>
          <li>• Document all decisions in resolution notes</li>
          <li>• Issue strikes for confirmed violations</li>
        </ul>
      </div>
    </div>
  );
}

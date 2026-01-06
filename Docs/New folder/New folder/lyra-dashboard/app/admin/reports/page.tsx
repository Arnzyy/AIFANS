'use client';

import { useState, useEffect } from 'react';
import {
  Flag,
  Eye,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Ban,
  MessageSquare,
  Image as ImageIcon,
  Bot,
  User,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { ContentReport } from '@/lib/creators/types';

interface ReportWithDetails extends ContentReport {
  reporter?: { email: string };
  model?: { display_name: string; avatar_url?: string };
  creator?: { legal_name?: string; business_name?: string };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'PENDING' | 'RESOLVED' | 'ALL'>('PENDING');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = filter !== 'ALL' ? `?status=${filter}` : '';
      const response = await fetch(`/api/admin/reports${params}`);
      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId: string, action: string, notes?: string) => {
    setProcessing(reportId);
    try {
      await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setSelectedReport(null);
    } catch (err) {
      console.error('Failed to resolve report');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Reports</h1>
          <p className="text-gray-400">Review and resolve user-submitted reports</p>
        </div>
        <div className="flex gap-2">
          {(['PENDING', 'RESOLVED', 'ALL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm ${
                filter === f
                  ? 'bg-purple-500 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-12 text-center">
          <Flag className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No reports</h2>
          <p className="text-gray-400">
            {filter === 'PENDING' ? 'No pending reports to review.' : 'No reports found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-3">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className={`w-full p-4 bg-zinc-900 rounded-xl text-left transition ${
                  selectedReport?.id === report.id ? 'ring-2 ring-purple-500' : 'hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getReasonColor(report.reason)}`}>
                      {report.reason}
                    </span>
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{report.description || 'No description'}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${
                    report.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                    report.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          {selectedReport ? (
            <ReportDetailPanel
              report={selectedReport}
              onResolve={handleResolve}
              processing={processing === selectedReport.id}
            />
          ) : (
            <div className="bg-zinc-900 rounded-xl p-12 text-center">
              <p className="text-gray-500">Select a report to review</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportDetailPanel({
  report,
  onResolve,
  processing,
}: {
  report: ReportWithDetails;
  onResolve: (id: string, action: string, notes?: string) => void;
  processing: boolean;
}) {
  const [notes, setNotes] = useState('');

  return (
    <div className="bg-zinc-900 rounded-xl p-6 h-fit sticky top-6">
      <h2 className="text-lg font-bold mb-4">Report Details</h2>

      {/* Reason */}
      <div className="mb-4">
        <span className={`px-3 py-1 rounded text-sm font-medium ${getReasonColor(report.reason)}`}>
          {report.reason}
        </span>
      </div>

      {/* Description */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-400 mb-1">Description</h4>
        <p className="text-sm">{report.description || 'No description provided'}</p>
      </div>

      {/* Reporter */}
      <div className="mb-6 bg-zinc-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Reporter</h4>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm">{report.reporter?.email || 'Anonymous'}</span>
        </div>
      </div>

      {/* Reported Content */}
      <div className="mb-6 bg-zinc-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Reported Content</h4>
        
        {report.reported_model_id && report.model && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-700 rounded-lg overflow-hidden">
              {report.model.avatar_url ? (
                <img src={report.model.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-gray-500" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium">{report.model.display_name}</p>
              <p className="text-xs text-gray-500">Model</p>
            </div>
          </div>
        )}

        {report.reported_content_id && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="font-medium">Content Item</p>
              <p className="text-xs text-gray-500">{report.reported_content_id}</p>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Timeline</h4>
        <div className="text-sm space-y-1">
          <p className="text-gray-500">
            Reported: {new Date(report.created_at).toLocaleString()}
          </p>
          {report.resolved_at && (
            <p className="text-gray-500">
              Resolved: {new Date(report.resolved_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Resolution Notes (if resolved) */}
      {report.status === 'RESOLVED' && report.resolution_notes && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-400 mb-1">Resolution</h4>
          <p className="text-sm">{report.action_taken}</p>
          {report.resolution_notes && (
            <p className="text-sm text-gray-400 mt-1">{report.resolution_notes}</p>
          )}
        </div>
      )}

      {/* Actions (if pending) */}
      {report.status === 'PENDING' && (
        <>
          <div className="mb-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Resolution notes (optional)..."
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm resize-none focus:outline-none focus:border-purple-500"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onResolve(report.id, 'CONTENT_REMOVED', notes)}
              disabled={processing}
              className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              Remove Content
            </button>
            <button
              onClick={() => onResolve(report.id, 'WARNING_ISSUED', notes)}
              disabled={processing}
              className="w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Issue Warning
            </button>
            <button
              onClick={() => onResolve(report.id, 'DISMISSED', notes)}
              disabled={processing}
              className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Dismiss Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function getReasonColor(reason: string): string {
  switch (reason.toUpperCase()) {
    case 'ILLEGAL_CONTENT':
    case 'CHILD_SAFETY':
      return 'bg-red-500/20 text-red-400';
    case 'HARASSMENT':
    case 'HATE_SPEECH':
      return 'bg-orange-500/20 text-orange-400';
    case 'SPAM':
    case 'IMPERSONATION':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'INAPPROPRIATE':
    case 'NSFW_VIOLATION':
      return 'bg-pink-500/20 text-pink-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

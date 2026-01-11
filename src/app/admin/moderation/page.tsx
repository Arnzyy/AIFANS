'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Check,
  X,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ImagePlus,
  Info,
  CheckCircle,
} from 'lucide-react';

interface ModerationItem {
  id: string;
  target_type: string;
  model_id: string;
  creator_id: string;
  r2_url: string;
  status: string;
  face_consistency_score: number;
  celebrity_risk_score: number;
  real_person_risk_score: number;
  deepfake_risk_score: number;
  minor_risk_score: number;
  flags: string[];
  staff_summary: string;
  scan_confidence: number;
  created_at: string;
  model?: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
  creator?: {
    id: string;
    legal_name: string;
    business_name: string;
    contact_email: string;
  };
  anchors?: {
    id: string;
    r2_url: string;
  }[];
}

export default function ModerationQueuePage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processing, setProcessing] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [addAsAnchor, setAddAsAnchor] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, [page, statusFilter]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
      });
      const response = await fetch(`/api/admin/moderation/queue?${params}`);
      const data = await response.json();
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch moderation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: 'approved' | 'rejected') => {
    if (!selectedItem) return;

    setProcessing(selectedItem.id);
    try {
      await fetch(`/api/admin/moderation/${selectedItem.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: reviewNotes,
          addAsAnchor: action === 'approved' && addAsAnchor,
        }),
      });

      // Remove from list and reset
      setItems(items.filter((i) => i.id !== selectedItem.id));
      setSelectedItem(null);
      setReviewNotes('');
      setAddAsAnchor(false);
    } catch (err) {
      console.error('Review failed:', err);
    } finally {
      setProcessing(null);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-400 bg-red-500/20';
    if (score >= 50) return 'text-orange-400 bg-orange-500/20';
    if (score >= 30) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-green-400 bg-green-500/20';
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/20';
    if (score >= 40) return 'text-orange-400 bg-orange-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getFlagColor = (flag: string) => {
    if (flag.includes('minor') || flag.includes('youth'))
      return 'bg-red-500/20 text-red-400';
    if (flag.includes('celeb')) return 'bg-orange-500/20 text-orange-400';
    if (flag.includes('deepfake') || flag.includes('faceswap'))
      return 'bg-purple-500/20 text-purple-400';
    if (flag.includes('drift') || flag.includes('inconsist'))
      return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-zinc-500/20 text-zinc-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            Moderation Queue
          </h1>
          <p className="text-zinc-400">
            Review flagged content and model submissions
          </p>
        </div>
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="font-medium text-blue-400">Virtual Staff Assistant</p>
            <p className="text-sm text-zinc-400">
              AI-powered scanning assists with moderation. All scores are
              suggestions — you make the final decision. Minor risk flags are
              prioritised and should be reviewed carefully.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg"
        >
          <option value="pending_review">Pending Review</option>
          <option value="pending_scan">Pending Scan</option>
          <option value="approved">Recently Approved</option>
          <option value="rejected">Recently Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue List */}
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-bold">Queue ({items.length})</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>All caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 cursor-pointer hover:bg-white/5 transition ${
                    selectedItem?.id === item.id
                      ? 'bg-purple-500/10 ring-2 ring-purple-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      {item.r2_url ? (
                        <img
                          src={item.r2_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImagePlus className="w-6 h-6 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {item.model?.display_name || 'Unknown Model'}
                        </p>
                        {item.minor_risk_score >= 50 && (
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 truncate">
                        {item.creator?.business_name || item.creator?.legal_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-500">
                          {item.target_type}
                        </span>
                        <span className="text-xs text-zinc-600">•</span>
                        <span className="text-xs text-zinc-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      {/* Flag chips */}
                      {item.flags && item.flags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.flags.slice(0, 3).map((flag, i) => (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded text-xs ${getFlagColor(
                                flag
                              )}`}
                            >
                              {flag.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {item.flags.length > 3 && (
                            <span className="px-2 py-0.5 rounded text-xs bg-zinc-500/20 text-zinc-400">
                              +{item.flags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-zinc-900 rounded-xl overflow-hidden">
          {selectedItem ? (
            <div className="h-full flex flex-col">
              {/* Image Comparison */}
              <div className="p-4 border-b border-white/10">
                <h2 className="font-bold mb-3">Image Comparison</h2>
                <div className="grid grid-cols-3 gap-2">
                  {/* Current Image */}
                  <div className="col-span-2">
                    <p className="text-xs text-zinc-500 mb-1">New Upload</p>
                    <div className="aspect-square rounded-lg overflow-hidden bg-zinc-800">
                      {selectedItem.r2_url ? (
                        <img
                          src={selectedItem.r2_url}
                          alt="New upload"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImagePlus className="w-8 h-8 text-zinc-600" />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Anchors */}
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">
                      Anchors ({selectedItem.anchors?.length || 0})
                    </p>
                    <div className="space-y-2">
                      {selectedItem.anchors?.slice(0, 4).map((anchor, i) => (
                        <div
                          key={i}
                          className="aspect-square rounded-lg overflow-hidden bg-zinc-800"
                        >
                          <img
                            src={anchor.r2_url}
                            alt={`Anchor ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {(!selectedItem.anchors ||
                        selectedItem.anchors.length === 0) && (
                        <div className="aspect-square rounded-lg bg-zinc-800 flex items-center justify-center">
                          <p className="text-xs text-zinc-600 text-center px-2">
                            No anchors
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scores */}
              <div className="p-4 border-b border-white/10">
                <h2 className="font-bold mb-3">Risk Assessment</h2>
                <div className="grid grid-cols-2 gap-3">
                  <ScoreCard
                    label="Face Consistency"
                    score={selectedItem.face_consistency_score}
                    colorFn={getConsistencyColor}
                    higherIsBetter
                  />
                  <ScoreCard
                    label="Celebrity Risk"
                    score={selectedItem.celebrity_risk_score}
                    colorFn={getRiskColor}
                  />
                  <ScoreCard
                    label="Real Person Risk"
                    score={selectedItem.real_person_risk_score}
                    colorFn={getRiskColor}
                  />
                  <ScoreCard
                    label="Deepfake Risk"
                    score={selectedItem.deepfake_risk_score}
                    colorFn={getRiskColor}
                  />
                  <ScoreCard
                    label="Minor Risk"
                    score={selectedItem.minor_risk_score}
                    colorFn={getRiskColor}
                    critical
                  />
                  <ScoreCard
                    label="Confidence"
                    score={selectedItem.scan_confidence}
                    colorFn={getConsistencyColor}
                    higherIsBetter
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 border-b border-white/10">
                <h2 className="font-bold mb-2">AI Summary</h2>
                <p className="text-sm text-zinc-400">
                  {selectedItem.staff_summary || 'No summary available.'}
                </p>

                {/* Flags */}
                {selectedItem.flags && selectedItem.flags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-zinc-500 mb-2">Flags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.flags.map((flag, i) => (
                        <span
                          key={i}
                          className={`px-2 py-1 rounded text-xs ${getFlagColor(
                            flag
                          )}`}
                        >
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 mt-auto">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Review Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                    className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm resize-none"
                  />
                </div>

                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addAsAnchor}
                    onChange={(e) => setAddAsAnchor(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Add as anchor image on approval</span>
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleReview('approved')}
                    disabled={processing === selectedItem.id}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing === selectedItem.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleReview('rejected')}
                    disabled={processing === selectedItem.id}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing === selectedItem.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Reject
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 p-8">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select an item to review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  colorFn,
  higherIsBetter = false,
  critical = false,
}: {
  label: string;
  score: number;
  colorFn: (score: number) => string;
  higherIsBetter?: boolean;
  critical?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg ${
        critical ? 'ring-1 ring-red-500/50' : 'bg-zinc-800'
      }`}
    >
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span
          className={`text-xl font-bold px-2 py-0.5 rounded ${colorFn(score)}`}
        >
          {score ?? '—'}
        </span>
        <span className="text-xs text-zinc-600">/ 100</span>
      </div>
    </div>
  );
}

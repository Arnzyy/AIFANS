'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Check,
  X,
  Clock,
  Loader2,
  ChevronRight,
  Shield,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { CreatorModel, getStatusColor, getStatusLabel, formatGBP } from '@/lib/creators/types';

export default function PendingModelsPage() {
  const [models, setModels] = useState<CreatorModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<CreatorModel | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/models?status=PENDING_REVIEW');
      const data = await response.json();
      setModels(data.models || []);
    } catch (err) {
      console.error('Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (modelId: string) => {
    setProcessing(modelId);
    try {
      await fetch(`/api/admin/models/${modelId}/approve`, { method: 'POST' });
      setModels((prev) => prev.filter((m) => m.id !== modelId));
      setSelectedModel(null);
    } catch (err) {
      console.error('Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (modelId: string) => {
    if (!rejectReason) return;
    setProcessing(modelId);
    try {
      await fetch(`/api/admin/models/${modelId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setModels((prev) => prev.filter((m) => m.id !== modelId));
      setSelectedModel(null);
      setShowRejectForm(false);
      setRejectReason('');
    } catch (err) {
      console.error('Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  // Safety checks
  const runSafetyChecks = (model: CreatorModel) => {
    const checks = [
      { label: 'Age is 18+', passed: model.age >= 18 },
      { label: 'Avatar uploaded', passed: !!model.avatar_url },
      { label: 'Display name set', passed: !!model.display_name && model.display_name.length > 0 },
      { label: 'No youth-coded terms', passed: !checkYouthCoded(model.bio || '', model.display_name) },
      { label: 'No celebrity names', passed: !checkCelebrityNames(model.display_name) },
      { label: 'At least one chat mode', passed: model.sfw_enabled || model.nsfw_enabled },
    ];
    return checks;
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
      <div>
        <h1 className="text-2xl font-bold">Pending Model Approvals</h1>
        <p className="text-gray-400">Review and approve new AI models</p>
      </div>

      {models.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-12 text-center">
          <Bot className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">All caught up!</h2>
          <p className="text-gray-400">No pending models to review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{models.length} pending model{models.length !== 1 ? 's' : ''}</p>
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model);
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                className={`w-full p-4 bg-zinc-900 rounded-xl text-left transition ${
                  selectedModel?.id === model.id ? 'ring-2 ring-purple-500' : 'hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                    {model.avatar_url ? (
                      <img src={model.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Bot className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{model.display_name}</p>
                    <p className="text-sm text-gray-400">Age: {model.age}</p>
                    <div className="flex gap-2 mt-1">
                      {model.nsfw_enabled && (
                        <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-xs rounded">NSFW</span>
                      )}
                      {model.sfw_enabled && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">SFW</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          {selectedModel ? (
            <div className="bg-zinc-900 rounded-xl p-6 h-fit sticky top-6">
              <h2 className="text-lg font-bold mb-4">Model Review</h2>

              {/* Preview */}
              <div className="flex gap-4 mb-6">
                <div className="w-24 h-24 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                  {selectedModel.avatar_url ? (
                    <img src={selectedModel.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Bot className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedModel.display_name}</h3>
                  <p className="text-gray-400">Age: {selectedModel.age}</p>
                  {selectedModel.tagline && (
                    <p className="text-sm text-gray-500 mt-1">{selectedModel.tagline}</p>
                  )}
                </div>
              </div>

              {/* Bio */}
              {selectedModel.bio && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Bio</h4>
                  <p className="text-sm">{selectedModel.bio}</p>
                </div>
              )}

              {/* Traits */}
              {selectedModel.persona_traits && selectedModel.persona_traits.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Traits</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedModel.persona_traits.map((trait, i) => (
                      <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery Preview */}
              {selectedModel.gallery_urls && selectedModel.gallery_urls.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Gallery</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedModel.gallery_urls.slice(0, 4).map((url, i) => (
                      <div key={i} className="aspect-square bg-zinc-800 rounded overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="mb-6 flex gap-4">
                <div className="flex-1 bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{formatGBP(selectedModel.subscription_price_monthly || 0)}</p>
                  <p className="text-xs text-gray-500">Monthly Price</p>
                </div>
                <div className="flex-1 bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{selectedModel.nsfw_enabled ? 'Yes' : 'No'}</p>
                  <p className="text-xs text-gray-500">NSFW Enabled</p>
                </div>
              </div>

              {/* Safety Checks */}
              <div className="bg-zinc-800 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Safety Checks
                </h3>
                <div className="space-y-2">
                  {runSafetyChecks(selectedModel).map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${
                        check.passed ? 'bg-green-500' : 'bg-red-500/50'
                      }`}>
                        {check.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </div>
                      <span className={check.passed ? '' : 'text-red-400'}>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning if checks fail */}
              {!runSafetyChecks(selectedModel).every((c) => c.passed) && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Some safety checks failed. Review carefully before approving.
                  </p>
                </div>
              )}

              {/* Actions */}
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={processing === selectedModel.id}
                    className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedModel.id)}
                    disabled={processing === selectedModel.id}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing === selectedModel.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Approve
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg resize-none focus:outline-none focus:border-red-500"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason('');
                      }}
                      className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(selectedModel.id)}
                      disabled={!rejectReason || processing === selectedModel.id}
                      className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-xl p-12 text-center">
              <p className="text-gray-500">Select a model to review</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Safety check helpers
function checkYouthCoded(bio: string, name: string): boolean {
  const youthTerms = ['teen', 'young', 'schoolgirl', 'innocent', 'virgin', 'underage', 'kid', 'child', 'minor'];
  const combined = (bio + ' ' + name).toLowerCase();
  return youthTerms.some((term) => combined.includes(term));
}

function checkCelebrityNames(name: string): boolean {
  const celebrities = ['taylor swift', 'beyonce', 'kim kardashian', 'emma watson', 'ariana grande', 'selena gomez'];
  return celebrities.some((celeb) => name.toLowerCase().includes(celeb));
}

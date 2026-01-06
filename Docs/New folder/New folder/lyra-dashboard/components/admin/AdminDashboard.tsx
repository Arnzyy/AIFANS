'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Image as ImageIcon,
  Flag,
  AlertTriangle,
  Check,
  X,
  Eye,
  ChevronRight,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  Shield,
  Ban,
  MessageSquare,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  Creator,
  CreatorModel,
  ContentReport,
  CreatorStrike,
  getStatusColor,
  getStatusLabel,
  formatGBP,
} from '@/lib/creators/types';

// ===========================================
// ADMIN DASHBOARD
// ===========================================

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'creators' | 'models' | 'reports' | 'strikes'>('creators');
  const [stats, setStats] = useState({
    pendingCreators: 0,
    pendingModels: 0,
    pendingReports: 0,
    activeStrikes: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch admin stats');
    }
  };

  const tabs = [
    { id: 'creators', label: 'Creator Approvals', icon: UserCheck, count: stats.pendingCreators },
    { id: 'models', label: 'Model Approvals', icon: ImageIcon, count: stats.pendingModels },
    { id: 'reports', label: 'Reports', icon: Flag, count: stats.pendingReports },
    { id: 'strikes', label: 'Strikes', icon: AlertTriangle, count: stats.activeStrikes },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-500" />
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-sm text-gray-400">Manage creators, models, and moderation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-zinc-900/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 rounded-full text-xs font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'creators' && <CreatorApprovalsQueue onUpdate={fetchStats} />}
        {activeTab === 'models' && <ModelApprovalsQueue onUpdate={fetchStats} />}
        {activeTab === 'reports' && <ReportsQueue onUpdate={fetchStats} />}
        {activeTab === 'strikes' && <StrikesManager />}
      </div>
    </div>
  );
}

// ===========================================
// CREATOR APPROVALS QUEUE
// ===========================================

function CreatorApprovalsQueue({ onUpdate }: { onUpdate: () => void }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/creators/pending');
      const data = await response.json();
      setCreators(data.creators || []);
    } catch (err) {
      console.error('Failed to fetch creators');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (creatorId: string) => {
    setProcessing(creatorId);
    try {
      await fetch(`/api/admin/creators/${creatorId}/approve`, { method: 'POST' });
      setCreators((prev) => prev.filter((c) => c.id !== creatorId));
      setSelectedCreator(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to approve creator');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (creatorId: string, reason: string) => {
    setProcessing(creatorId);
    try {
      await fetch(`/api/admin/creators/${creatorId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      setCreators((prev) => prev.filter((c) => c.id !== creatorId));
      setSelectedCreator(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to reject creator');
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

  if (creators.length === 0) {
    return (
      <div className="text-center py-12">
        <UserCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No pending creator approvals</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold mb-4">Pending Creators ({creators.length})</h2>
        {creators.map((creator) => (
          <div
            key={creator.id}
            onClick={() => setSelectedCreator(creator)}
            className={`p-4 bg-zinc-900 rounded-xl cursor-pointer transition ${
              selectedCreator?.id === creator.id
                ? 'ring-2 ring-purple-500'
                : 'hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {creator.legal_name || creator.business_name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-400">{creator.contact_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(creator.status)}`}>
                  {creator.account_type}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(creator.onboarding_completed_at || creator.created_at).toLocaleDateString()}
              </span>
              <span>{creator.country_code}</span>
              {creator.stripe_connect_onboarding_complete && (
                <span className="text-green-400">Stripe ✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedCreator && (
        <CreatorDetailPanel
          creator={selectedCreator}
          onApprove={() => handleApprove(selectedCreator.id)}
          onReject={(reason) => handleReject(selectedCreator.id, reason)}
          processing={processing === selectedCreator.id}
        />
      )}
    </div>
  );
}

// ===========================================
// CREATOR DETAIL PANEL
// ===========================================

function CreatorDetailPanel({
  creator,
  onApprove,
  onReject,
  processing,
}: {
  creator: Creator;
  onApprove: () => void;
  onReject: (reason: string) => void;
  processing: boolean;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="bg-zinc-900 rounded-xl p-6 sticky top-6">
      <h3 className="text-lg font-bold mb-4">Creator Details</h3>

      <div className="space-y-4">
        {/* Basic Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Account Information</h4>
          <div className="space-y-2 text-sm">
            <InfoRow label="Type" value={creator.account_type} />
            <InfoRow label="Name" value={creator.legal_name || creator.business_name || '-'} />
            <InfoRow label="DOB" value={creator.date_of_birth || '-'} />
            <InfoRow label="Country" value={creator.country_code || '-'} />
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Contact</h4>
          <div className="space-y-2 text-sm">
            <InfoRow label="Email" value={creator.contact_email || '-'} />
            <InfoRow label="Phone" value={creator.contact_phone || '-'} />
          </div>
        </div>

        {/* Address */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Address</h4>
          <p className="text-sm">
            {creator.address_line1}<br />
            {creator.address_line2 && <>{creator.address_line2}<br /></>}
            {creator.city}, {creator.state} {creator.postal_code}
          </p>
        </div>

        {/* Stripe Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Stripe Connect</h4>
          <div className="space-y-2 text-sm">
            <InfoRow 
              label="Onboarding" 
              value={creator.stripe_connect_onboarding_complete ? '✓ Complete' : '✗ Incomplete'}
              valueClass={creator.stripe_connect_onboarding_complete ? 'text-green-400' : 'text-red-400'}
            />
            <InfoRow 
              label="Payouts" 
              value={creator.stripe_payouts_enabled ? '✓ Enabled' : '✗ Disabled'}
              valueClass={creator.stripe_payouts_enabled ? 'text-green-400' : 'text-yellow-400'}
            />
          </div>
        </div>

        {/* Declarations */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Declarations</h4>
          <InfoRow 
            label="Accepted" 
            value={creator.declarations_accepted_at ? 
              new Date(creator.declarations_accepted_at).toLocaleDateString() : 
              'Not accepted'}
            valueClass={creator.declarations_accepted_at ? 'text-green-400' : 'text-red-400'}
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10">
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button
                onClick={onApprove}
                disabled={processing}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={processing}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-2 bg-zinc-700 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onReject(rejectReason)}
                  disabled={!rejectReason || processing}
                  className="flex-1 py-2 bg-red-500 rounded-lg text-sm disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// MODEL APPROVALS QUEUE
// ===========================================

function ModelApprovalsQueue({ onUpdate }: { onUpdate: () => void }) {
  const [models, setModels] = useState<(CreatorModel & { creator?: Creator })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<CreatorModel | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/models/pending');
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
      onUpdate();
    } catch (err) {
      console.error('Failed to approve model');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (modelId: string, reason: string) => {
    setProcessing(modelId);
    try {
      await fetch(`/api/admin/models/${modelId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      setModels((prev) => prev.filter((m) => m.id !== modelId));
      setSelectedModel(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to reject model');
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

  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No pending model approvals</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold mb-4">Pending Models ({models.length})</h2>
        {models.map((model) => (
          <div
            key={model.id}
            onClick={() => setSelectedModel(model)}
            className={`p-4 bg-zinc-900 rounded-xl cursor-pointer transition ${
              selectedModel?.id === model.id
                ? 'ring-2 ring-purple-500'
                : 'hover:bg-zinc-800'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden">
                {model.avatar_url && (
                  <img src={model.avatar_url} alt={model.display_name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{model.display_name}</p>
                <p className="text-sm text-gray-400">Age: {model.age}</p>
              </div>
              <div className="flex items-center gap-2">
                {model.nsfw_enabled && (
                  <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs">NSFW</span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedModel && (
        <ModelDetailPanel
          model={selectedModel}
          onApprove={() => handleApprove(selectedModel.id)}
          onReject={(reason) => handleReject(selectedModel.id, reason)}
          processing={processing === selectedModel.id}
        />
      )}
    </div>
  );
}

// ===========================================
// MODEL DETAIL PANEL
// ===========================================

function ModelDetailPanel({
  model,
  onApprove,
  onReject,
  processing,
}: {
  model: CreatorModel;
  onApprove: () => void;
  onReject: (reason: string) => void;
  processing: boolean;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="bg-zinc-900 rounded-xl p-6 sticky top-6">
      <h3 className="text-lg font-bold mb-4">Model Details</h3>

      {/* Preview */}
      <div className="mb-6">
        <div className="aspect-[3/1] bg-zinc-800 rounded-lg overflow-hidden mb-4">
          {model.cover_url ? (
            <img src={model.cover_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              No cover image
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-zinc-800 overflow-hidden border-4 border-zinc-900 -mt-10 relative z-10">
            {model.avatar_url && (
              <img src={model.avatar_url} alt={model.display_name} className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <h4 className="text-xl font-bold">{model.display_name}</h4>
            <p className="text-gray-400">{model.tagline}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Basic Info</h4>
          <div className="space-y-2 text-sm">
            <InfoRow label="Age" value={model.age.toString()} />
            <InfoRow label="Language" value={model.primary_language} />
            <InfoRow label="Price" value={formatGBP(model.subscription_price_monthly || 0) + '/mo'} />
          </div>
        </div>

        {/* Chat Modes */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Chat Modes</h4>
          <div className="flex gap-2">
            {model.sfw_enabled && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Companion (SFW)</span>
            )}
            {model.nsfw_enabled && (
              <span className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs">Intimate (NSFW)</span>
            )}
          </div>
        </div>

        {/* Bio */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Bio</h4>
          <p className="text-sm">{model.bio || 'No bio provided'}</p>
        </div>

        {/* Traits */}
        {model.persona_traits && model.persona_traits.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Personality Traits</h4>
            <div className="flex flex-wrap gap-1">
              {model.persona_traits.map((trait, i) => (
                <span key={i} className="px-2 py-0.5 bg-purple-500/20 rounded text-xs">{trait}</span>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        {model.gallery_urls && model.gallery_urls.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-2">Gallery Preview</h4>
            <div className="grid grid-cols-4 gap-1">
              {model.gallery_urls.slice(0, 4).map((url, i) => (
                <div key={i} className="aspect-square bg-zinc-800 rounded overflow-hidden">
                  <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Moderation Checklist */}
        <div className="p-3 bg-zinc-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Moderation Checklist</h4>
          <div className="space-y-1 text-xs">
            <CheckItem label="Age 18+" checked={model.age >= 18} />
            <CheckItem label="No youth-coded content" checked={true} />
            <CheckItem label="No real person likeness" checked={true} />
            <CheckItem label="No celebrity impersonation" checked={true} />
            <CheckItem label="Public images are SFW" checked={true} />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-white/10">
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button
                onClick={onApprove}
                disabled={processing}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={processing}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 py-2 bg-zinc-700 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onReject(rejectReason)}
                  disabled={!rejectReason || processing}
                  className="flex-1 py-2 bg-red-500 rounded-lg text-sm disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// REPORTS QUEUE
// ===========================================

function ReportsQueue({ onUpdate }: { onUpdate: () => void }) {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/reports/pending');
      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId: string, action: string) => {
    try {
      await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      onUpdate();
    } catch (err) {
      console.error('Failed to resolve report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <Flag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No pending reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Pending Reports ({reports.length})</h2>
      
      {reports.map((report) => (
        <div key={report.id} className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                {report.reason}
              </span>
              <p className="text-sm text-gray-400 mt-2">{report.description}</p>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(report.created_at).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleResolve(report.id, 'CONTENT_REMOVED')}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
            >
              Remove Content
            </button>
            <button
              onClick={() => handleResolve(report.id, 'WARNED')}
              className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded text-sm hover:bg-yellow-500/30"
            >
              Warn Creator
            </button>
            <button
              onClick={() => handleResolve(report.id, 'DISMISSED')}
              className="px-3 py-1.5 bg-zinc-700 rounded text-sm hover:bg-zinc-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================
// STRIKES MANAGER
// ===========================================

function StrikesManager() {
  const [strikes, setStrikes] = useState<CreatorStrike[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrikes();
  }, []);

  const fetchStrikes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/strikes');
      const data = await response.json();
      setStrikes(data.strikes || []);
    } catch (err) {
      console.error('Failed to fetch strikes');
    } finally {
      setLoading(false);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Active Strikes</h2>
        <button className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium">
          Issue New Strike
        </button>
      </div>

      {strikes.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No active strikes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {strikes.map((strike) => (
            <div key={strike.id} className="bg-zinc-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  strike.severity === 'BAN' ? 'bg-red-500/20 text-red-400' :
                  strike.severity === 'FINAL_WARNING' ? 'bg-orange-500/20 text-orange-400' :
                  strike.severity === 'STRIKE' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {strike.severity}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(strike.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm">{strike.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================
// HELPER COMPONENTS
// ===========================================

function InfoRow({ 
  label, 
  value, 
  valueClass = '' 
}: { 
  label: string; 
  value: string; 
  valueClass?: string 
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded flex items-center justify-center ${
        checked ? 'bg-green-500' : 'bg-red-500'
      }`}>
        {checked ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
      <span className={checked ? '' : 'text-red-400'}>{label}</span>
    </div>
  );
}

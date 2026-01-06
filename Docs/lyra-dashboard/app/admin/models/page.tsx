'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Ban,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { CreatorModel, getStatusColor, getStatusLabel, formatGBP } from '@/lib/creators/types';

export default function AllModelsPage() {
  const [models, setModels] = useState<CreatorModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedModel, setSelectedModel] = useState<CreatorModel | null>(null);

  useEffect(() => {
    fetchModels();
  }, [page, statusFilter]);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      });
      const response = await fetch(`/api/admin/models?${params}`);
      const data = await response.json();
      setModels(data.models || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = models.filter((model) => {
    if (!searchQuery) return true;
    return model.display_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSuspend = async (modelId: string) => {
    if (!confirm('Are you sure you want to suspend this model?')) return;
    try {
      await fetch(`/api/admin/models/${modelId}/suspend`, { method: 'POST' });
      fetchModels();
      setSelectedModel(null);
    } catch (err) {
      console.error('Failed to suspend');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Models</h1>
          <p className="text-gray-400">Manage AI models and personas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg"
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No models found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onClick={() => setSelectedModel(model)}
            />
          ))}
        </div>
      )}

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

      {/* Model Detail Modal */}
      {selectedModel && (
        <ModelDetailModal
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onSuspend={() => handleSuspend(selectedModel.id)}
        />
      )}
    </div>
  );
}

function ModelCard({ model, onClick }: { model: CreatorModel; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition"
    >
      <div className="aspect-square bg-zinc-800 relative">
        {model.avatar_url ? (
          <img src={model.avatar_url} alt={model.display_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Bot className="w-12 h-12 text-gray-600" />
          </div>
        )}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs ${getStatusColor(model.status)}`}>
          {getStatusLabel(model.status)}
        </div>
        {model.nsfw_enabled && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-pink-500/80 rounded text-xs">NSFW</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold">{model.display_name}</h3>
        <p className="text-sm text-gray-400">Age: {model.age}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {model.subscriber_count}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {formatGBP(model.subscription_price_monthly || 0)}/mo
          </span>
        </div>
      </div>
    </div>
  );
}

function ModelDetailModal({
  model,
  onClose,
  onSuspend,
}: {
  model: CreatorModel;
  onClose: () => void;
  onSuspend: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="relative">
          {model.cover_url ? (
            <img src={model.cover_url} alt="" className="w-full h-32 object-cover" />
          ) : (
            <div className="w-full h-32 bg-gradient-to-r from-purple-500/20 to-pink-500/20" />
          )}
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-xl bg-zinc-800 border-4 border-zinc-900 overflow-hidden">
              {model.avatar_url ? (
                <img src={model.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Bot className="w-8 h-8 text-gray-600" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-16 px-6 pb-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{model.display_name}</h2>
              <p className="text-gray-400">Age: {model.age} • {model.primary_language}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(model.status)}`}>
              {getStatusLabel(model.status)}
            </span>
          </div>

          {model.tagline && <p className="text-gray-300">{model.tagline}</p>}

          {model.bio && (
            <div>
              <h3 className="font-medium mb-2">Bio</h3>
              <p className="text-sm text-gray-400">{model.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{model.subscriber_count}</p>
              <p className="text-xs text-gray-500">Subscribers</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{formatGBP(model.subscription_price_monthly || 0)}</p>
              <p className="text-xs text-gray-500">Monthly Price</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{formatGBP(model.total_earnings)}</p>
              <p className="text-xs text-gray-500">Total Earnings</p>
            </div>
          </div>

          {/* Traits */}
          {model.persona_traits && model.persona_traits.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Personality Traits</h3>
              <div className="flex flex-wrap gap-2">
                {model.persona_traits.map((trait, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-500/20 rounded-full text-sm">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chat Modes */}
          <div className="flex gap-2">
            {model.sfw_enabled && (
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                Companion Mode
              </span>
            )}
            {model.nsfw_enabled && (
              <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm">
                Intimate Mode
              </span>
            )}
          </div>

          {/* Gallery */}
          {model.gallery_urls && model.gallery_urls.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Gallery</h3>
              <div className="grid grid-cols-4 gap-2">
                {model.gallery_urls.slice(0, 8).map((url, i) => (
                  <div key={i} className="aspect-square bg-zinc-800 rounded-lg overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {model.rejection_reason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h3 className="font-medium text-red-400 mb-1">Rejection Reason</h3>
              <p className="text-sm">{model.rejection_reason}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
            Close
          </button>
          {model.status === 'APPROVED' && (
            <button onClick={onSuspend} className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg">
              Suspend Model
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Package,
  Eye,
  Users,
  TrendingUp,
  Loader2,
  X,
  Check,
  Image as ImageIcon,
  Video,
  Lock,
  ExternalLink,
  Copy,
  MoreVertical,
  Trash2,
  Edit2,
} from 'lucide-react';
import { PPVOffer, ContentItem, formatGBP } from '@/lib/creators/types';

// ===========================================
// PPV MANAGER COMPONENT
// ===========================================

interface PPVManagerProps {
  modelId: string;
  creatorId: string;
}

export function PPVManager({ modelId, creatorId }: PPVManagerProps) {
  const [ppvOffers, setPpvOffers] = useState<PPVOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPPVOffers();
  }, [modelId]);

  const fetchPPVOffers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/creator/models/${modelId}/ppv`);
      const data = await response.json();
      setPpvOffers(data.offers || []);
    } catch (err) {
      console.error('Failed to fetch PPV offers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ppvId: string) => {
    if (!confirm('Delete this PPV offer?')) return;

    try {
      await fetch(`/api/creator/ppv/${ppvId}`, { method: 'DELETE' });
      setPpvOffers((prev) => prev.filter((p) => p.id !== ppvId));
    } catch (err) {
      console.error('Delete failed');
    }
  };

  // Calculate totals
  const totalRevenue = ppvOffers.reduce((sum, p) => sum + p.total_revenue_tokens, 0);
  const totalSales = ppvOffers.reduce((sum, p) => sum + p.purchase_count, 0);
  const activeOffers = ppvOffers.filter((p) => p.status === 'ACTIVE').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-xl font-bold">{totalRevenue.toLocaleString()} tokens</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Sales</p>
              <p className="text-xl font-bold">{totalSales}</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Offers</p>
              <p className="text-xl font-bold">{activeOffers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">PPV Offers</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create PPV
        </button>
      </div>

      {/* PPV List */}
      {ppvOffers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-zinc-900 rounded-xl">
          <Package className="w-12 h-12 mb-3 opacity-50" />
          <p>No PPV offers yet</p>
          <p className="text-sm">Create your first pay-per-view content pack</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium"
          >
            Create PPV
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ppvOffers.map((ppv) => (
            <PPVCard key={ppv.id} ppv={ppv} onDelete={() => handleDelete(ppv.id)} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePPVModal
          modelId={modelId}
          creatorId={creatorId}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchPPVOffers();
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

// ===========================================
// PPV CARD
// ===========================================

function PPVCard({ ppv, onDelete }: { ppv: PPVOffer; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = () => {
    switch (ppv.status) {
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-400';
      case 'EXPIRED':
        return 'bg-gray-500/20 text-gray-400';
      case 'DRAFT':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      {/* Preview Image */}
      <div className="aspect-video bg-zinc-800 relative">
        {ppv.preview_url ? (
          <img src={ppv.preview_url} alt={ppv.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-600" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor()}`}>
          {ppv.status}
        </div>

        {/* Content Count */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded text-xs">
          {ppv.content_item_ids.length} items
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold">{ppv.title}</h3>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 bg-zinc-800 border border-white/10 rounded-lg shadow-lg py-1 z-10 min-w-32">
                <button className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 flex items-center gap-2">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 flex items-center gap-2">
                  <Copy className="w-4 h-4" /> Copy Link
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/10 text-red-400 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {ppv.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">{ppv.description}</p>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-green-400">{ppv.price_tokens} tokens</span>
          <span className="text-sm text-gray-500">({formatGBP(ppv.price_gbp_minor)})</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {ppv.purchase_count} sales
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {ppv.total_revenue_tokens.toLocaleString()} earned
          </div>
        </div>

        {/* Subscribers Only Badge */}
        {ppv.subscribers_only && (
          <div className="mt-3 flex items-center gap-1 text-xs text-blue-400">
            <Lock className="w-3 h-3" />
            Subscribers only
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================
// CREATE PPV MODAL
// ===========================================

interface CreatePPVModalProps {
  modelId: string;
  creatorId: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreatePPVModal({ modelId, creatorId, onClose, onCreated }: CreatePPVModalProps) {
  const [step, setStep] = useState(1);
  const [availableContent, setAvailableContent] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceTokens, setPriceTokens] = useState(500);
  const [subscribersOnly, setSubscribersOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    fetchAvailableContent();
  }, []);

  const fetchAvailableContent = async () => {
    setContentLoading(true);
    try {
      const response = await fetch(`/api/creator/models/${modelId}/content?visibility=SUBSCRIBERS`);
      const data = await response.json();
      setAvailableContent(data.content || []);
    } catch (err) {
      console.error('Failed to fetch content');
    } finally {
      setContentLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title || selectedContent.length === 0) return;

    setLoading(true);
    try {
      await fetch('/api/creator/ppv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          title,
          description,
          price_tokens: priceTokens,
          subscribers_only: subscribersOnly,
          content_item_ids: selectedContent,
          preview_url: availableContent.find((c) => c.id === selectedContent[0])?.storage_url,
        }),
      });
      onCreated();
    } catch (err) {
      console.error('Create failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleContent = (id: string) => {
    setSelectedContent((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // GBP equivalent (250 tokens = £1)
  const priceGbp = priceTokens / 250;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold">Create PPV Offer</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium">Select Content</h3>
              <p className="text-sm text-gray-400">Choose the content items to include in this PPV pack</p>

              {contentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : availableContent.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <p>No subscriber content available</p>
                  <p className="text-sm">Upload content and set visibility to "Subscribers" first</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableContent.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleContent(item.id)}
                      className={`aspect-square rounded-lg overflow-hidden relative ${
                        selectedContent.includes(item.id)
                          ? 'ring-2 ring-purple-500'
                          : ''
                      }`}
                    >
                      <img
                        src={item.thumbnail_url || item.storage_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {selectedContent.includes(item.id) && (
                        <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                          <Check className="w-6 h-6" />
                        </div>
                      )}
                      {item.type === 'VIDEO' && (
                        <div className="absolute bottom-1 right-1 p-0.5 bg-black/80 rounded">
                          <Video className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-400">
                {selectedContent.length} item{selectedContent.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Exclusive Photo Set"
                  maxLength={255}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what's included..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price (Tokens)</label>
                <input
                  type="number"
                  value={priceTokens}
                  onChange={(e) => setPriceTokens(parseInt(e.target.value) || 0)}
                  min={50}
                  max={50000}
                  step={50}
                  className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  ≈ £{priceGbp.toFixed(2)} | You earn: {Math.floor(priceTokens * 0.8)} tokens
                </p>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subscribersOnly}
                    onChange={(e) => setSubscribersOnly(e.target.checked)}
                    className="w-5 h-5 rounded border-white/20 bg-zinc-700 text-purple-500 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium">Subscribers Only</span>
                    <p className="text-sm text-gray-400">Only active subscribers can purchase</p>
                  </div>
                </label>
              </div>

              {/* Preview */}
              <div className="p-4 bg-zinc-800 rounded-lg">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded bg-zinc-700 overflow-hidden">
                    {selectedContent.length > 0 && (
                      <img
                        src={availableContent.find((c) => c.id === selectedContent[0])?.storage_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{title || 'Untitled'}</p>
                    <p className="text-sm text-gray-400">{selectedContent.length} items</p>
                    <p className="text-green-400">{priceTokens} tokens</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-white/10">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={selectedContent.length === 0}
                className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium disabled:opacity-50"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !title}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create PPV'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PPVManager;

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Loader2,
  ChevronRight,
  Users,
  DollarSign,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Send,
} from 'lucide-react';
import {
  CreatorModel,
  Creator,
  getStatusColor,
  getStatusLabel,
  formatGBP,
} from '@/lib/creators/types';

export default function ModelsPage() {
  const [models, setModels] = useState<CreatorModel[]>([]);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [modelsRes, creatorRes] = await Promise.all([
        fetch('/api/creator/models'),
        fetch('/api/creator/onboarding'),
      ]);

      const modelsData = await modelsRes.json();
      const creatorData = await creatorRes.json();

      setModels(modelsData.models || []);
      setCreator(creatorData.creator);
    } catch (err) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const canCreateModel = creator && models.length < (creator.max_models_allowed || 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Models</h1>
          <p className="text-gray-400">
            {models.length} / {creator?.max_models_allowed || 1} models
          </p>
        </div>
        {canCreateModel ? (
          <Link
            href="/dashboard/models/new"
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Model
          </Link>
        ) : (
          <span className="px-4 py-2 bg-zinc-800 text-gray-400 rounded-lg text-sm">
            Model limit reached
          </span>
        )}
      </div>

      {/* Models Grid */}
      {models.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-12 text-center">
          <h2 className="text-xl font-bold mb-2">Create Your First Model</h2>
          <p className="text-gray-400 mb-6">
            Models are AI personas that subscribers can chat with
          </p>
          <Link
            href="/dashboard/models/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Model
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} onUpdate={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelCard({ model, onUpdate }: { model: CreatorModel; onUpdate: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this model? This cannot be undone.')) return;

    try {
      await fetch(`/api/creator/models/${model.id}`, { method: 'DELETE' });
      onUpdate();
    } catch (err) {
      console.error('Delete failed');
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      {/* Cover */}
      <div className="aspect-video bg-zinc-800 relative">
        {model.cover_url ? (
          <img src={model.cover_url} alt="" className="w-full h-full object-cover" />
        ) : model.avatar_url ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
            <img
              src={model.avatar_url}
              alt=""
              className="w-24 h-24 rounded-full object-cover border-4 border-zinc-900"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            No image
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(model.status)}`}>
            {getStatusLabel(model.status)}
          </span>
        </div>

        {/* Menu */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-lg"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-zinc-800 rounded-lg shadow-xl border border-white/10 py-1 min-w-[140px] z-10">
              <Link
                href={`/dashboard/models/${model.id}`}
                className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <Link
                href={`/dashboard/models/${model.id}/content`}
                className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm"
              >
                <Eye className="w-4 h-4" />
                Content
              </Link>
              {model.status === 'DRAFT' && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-sm text-red-400 w-full text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">{model.display_name}</h3>
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
          {model.bio || model.tagline || 'No description'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-gray-400">
            <Users className="w-4 h-4" />
            {model.subscriber_count}
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <DollarSign className="w-4 h-4" />
            {formatGBP(model.subscription_price_monthly || 0)}/mo
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          {model.nsfw_enabled && (
            <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs">
              NSFW
            </span>
          )}
          {model.sfw_enabled && (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
              Companion
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4">
        {model.status === 'DRAFT' ? (
          <Link
            href={`/dashboard/models/${model.id}/edit`}
            className="block w-full py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-center text-sm font-medium"
          >
            Continue Editing
          </Link>
        ) : model.status === 'APPROVED' ? (
          <Link
            href={`/dashboard/models/${model.id}/content`}
            className="block w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-center text-sm"
          >
            Manage Content
          </Link>
        ) : (
          <div className="py-2 bg-zinc-800 rounded-lg text-center text-sm text-gray-400">
            {model.status === 'PENDING_REVIEW' ? 'Awaiting approval...' : model.rejection_reason || 'Status: ' + model.status}
          </div>
        )}
      </div>
    </div>
  );
}

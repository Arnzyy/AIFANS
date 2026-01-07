'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Edit,
  Trash2,
  Eye,
  Users,
  MessageSquare,
  DollarSign,
} from 'lucide-react';

interface Model {
  id: string;
  name: string;
  age: number;
  avatar_url?: string;
  status: string;
  is_active: boolean;
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  subscription_price: number;
  subscriber_count: number;
  total_messages: number;
  total_earnings: number;
  created_at: string;
  rejection_reason?: string;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'text-zinc-400 bg-zinc-500/20', icon: FileText },
  pending_review: { label: 'Pending Review', color: 'text-yellow-400 bg-yellow-500/20', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-400 bg-green-500/20', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400 bg-red-500/20', icon: XCircle },
  suspended: { label: 'Suspended', color: 'text-orange-400 bg-orange-500/20', icon: XCircle },
} as const;

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(3);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/creator/models');
      const data = await res.json();

      if (data.models) {
        setModels(data.models);
        setLimit(data.limit);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      const res = await fetch(`/api/creator/models/${modelId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setModels(models.filter(m => m.id !== modelId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete model');
      }
    } catch (error) {
      console.error('Error deleting model:', error);
    }
  };

  const canCreateMore = models.length < limit;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-800 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-6 animate-pulse">
              <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto mb-4" />
              <div className="h-4 bg-zinc-800 rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Models</h1>
          <p className="text-zinc-400 mt-1">
            {models.length} of {limit} models created
          </p>
        </div>

        {canCreateMore && (
          <Link
            href="/dashboard/models/new"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus size={18} />
            Create Model
          </Link>
        )}
      </div>

      {models.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-12 text-center">
          <Sparkles size={48} className="mx-auto text-zinc-600 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Models Yet</h2>
          <p className="text-zinc-400 mb-6">
            Create your first AI persona to start earning
          </p>
          <Link
            href="/dashboard/models/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={18} />
            Create Your First Model
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => {
            const statusInfo = statusConfig[model.status as keyof typeof statusConfig] || statusConfig.draft;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={model.id}
                className="bg-zinc-900 rounded-xl overflow-hidden"
              >
                {/* Avatar */}
                <div className="aspect-square relative bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  {model.avatar_url ? (
                    <img
                      src={model.avatar_url}
                      alt={model.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl font-bold text-white/20">
                        {model.name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
                      <StatusIcon size={12} />
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Mode Badges */}
                  <div className="absolute top-4 right-4 flex gap-1">
                    {model.nsfw_enabled && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">
                        NSFW
                      </span>
                    )}
                    {model.sfw_enabled && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
                        SFW
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{model.name}</h3>
                  <p className="text-sm text-zinc-400">Age: {model.age}</p>

                  {/* Stats */}
                  {model.status === 'approved' && (
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-zinc-800 rounded-lg p-2">
                        <Users size={14} className="mx-auto text-zinc-400 mb-1" />
                        <p className="text-sm font-medium">{model.subscriber_count}</p>
                      </div>
                      <div className="bg-zinc-800 rounded-lg p-2">
                        <MessageSquare size={14} className="mx-auto text-zinc-400 mb-1" />
                        <p className="text-sm font-medium">{model.total_messages}</p>
                      </div>
                      <div className="bg-zinc-800 rounded-lg p-2">
                        <DollarSign size={14} className="mx-auto text-zinc-400 mb-1" />
                        <p className="text-sm font-medium">
                          £{(model.total_earnings / 100).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {model.status === 'rejected' && model.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-500/10 rounded-lg text-sm text-red-400">
                      <strong>Reason:</strong> {model.rejection_reason}
                    </div>
                  )}

                  {/* Price */}
                  <p className="mt-4 text-sm text-zinc-400">
                    £{(model.subscription_price / 100).toFixed(2)}/month
                  </p>
                </div>

                {/* Actions */}
                <div className="border-t border-zinc-800 p-4 flex justify-between">
                  <div className="flex gap-2">
                    {model.status === 'approved' && (
                      <Link
                        href={`/model/${model.id}`}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                        title="View public page"
                      >
                        <Eye size={18} />
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/models/${model.id}`}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Edit model"
                    >
                      <Edit size={18} />
                    </Link>
                  </div>

                  {(model.status === 'draft' || model.status === 'rejected') && (
                    <button
                      onClick={() => handleDelete(model.id)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Delete model"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Create New Card */}
          {canCreateMore && (
            <Link
              href="/dashboard/models/new"
              className="bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center min-h-[400px] hover:border-purple-500 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                <Plus size={32} className="text-purple-400" />
              </div>
              <p className="font-medium">Create New Model</p>
              <p className="text-sm text-zinc-400 mt-1">
                {limit - models.length} slots remaining
              </p>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

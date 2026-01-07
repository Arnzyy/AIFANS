'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  X,
  User,
  Sparkles,
  MessageSquare,
  Tag,
  Image,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Model {
  id: string;
  creator_id: string;
  name: string;
  age: number;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  personality_traits: string[];
  interests: string[];
  backstory?: string;
  speaking_style?: string;
  physical_traits?: Record<string, string>;
  turn_ons?: string[];
  turn_offs?: string[];
  emoji_usage: string;
  response_length: string;
  subscription_price: number;
  price_per_message?: number;
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  default_chat_mode: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
  approved_at?: string;
}

interface Creator {
  id: string;
  display_name: string;
  status: string;
}

interface TagInfo {
  tag_id: string;
  is_primary: boolean;
  tag?: {
    name: string;
    slug: string;
    category: string;
  };
}

interface ContentSample {
  id: string;
  type: string;
  url: string;
  thumbnail_url?: string;
  visibility: string;
  is_nsfw: boolean;
}

export default function AdminModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.id as string;

  const [model, setModel] = useState<Model | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [contentSamples, setContentSamples] = useState<ContentSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/models/${modelId}`);
        const data = await res.json();

        if (data.error) {
          console.error(data.error);
          router.push('/admin/models');
          return;
        }

        setModel(data.model);
        setCreator(data.creator);
        setTags(data.tags || []);
        setContentSamples(data.content_samples || []);
      } catch (error) {
        console.error('Error fetching model:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [modelId, router]);

  const handleApprove = async () => {
    if (!confirm('Approve this model?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/models/${modelId}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setModel(data.model);
      }
    } catch (error) {
      console.error('Error approving model:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/models/${modelId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        const data = await res.json();
        setModel(data.model);
      }
    } catch (error) {
      console.error('Error rejecting model:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-800 rounded w-48 animate-pulse" />
        <div className="h-64 bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Model not found</p>
        <Link href="/admin/models" className="text-purple-400 hover:underline mt-2 block">
          Back to models
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/models"
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
              {model.avatar_url ? (
                <img src={model.avatar_url} alt={model.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold">{model.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{model.name}</h1>
              <p className="text-zinc-400">Age: {model.age} • by {creator?.display_name}</p>
            </div>
          </div>
        </div>

        {model.status === 'pending_review' && (
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <X size={18} />
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Check size={18} />
              Approve
            </button>
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className={`
        p-4 rounded-xl flex items-center gap-3
        ${model.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-400' : ''}
        ${model.status === 'approved' ? 'bg-green-500/20 text-green-400' : ''}
        ${model.status === 'rejected' ? 'bg-red-500/20 text-red-400' : ''}
        ${model.status === 'draft' ? 'bg-zinc-500/20 text-zinc-400' : ''}
      `}>
        {model.status === 'pending_review' && <Clock size={20} />}
        {model.status === 'approved' && <CheckCircle size={20} />}
        {model.status === 'rejected' && <XCircle size={20} />}
        <span className="font-medium capitalize">{model.status.replace('_', ' ')}</span>
        {model.rejection_reason && (
          <span className="text-sm opacity-75">
            - Reason: {model.rejection_reason}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <User size={18} className="text-zinc-400" />
            Basic Information
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Name</span>
              <span>{model.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Age</span>
              <span>{model.age}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Created</span>
              <span>{new Date(model.created_at).toLocaleDateString()}</span>
            </div>
            {model.bio && (
              <div>
                <span className="text-zinc-400 block mb-1">Bio</span>
                <p className="text-sm bg-zinc-800 p-3 rounded">{model.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Settings */}
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare size={18} className="text-zinc-400" />
            Chat Settings
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">NSFW Enabled</span>
              <span className={model.nsfw_enabled ? 'text-green-400' : 'text-zinc-500'}>
                {model.nsfw_enabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">SFW Enabled</span>
              <span className={model.sfw_enabled ? 'text-green-400' : 'text-zinc-500'}>
                {model.sfw_enabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Default Mode</span>
              <span className="uppercase">{model.default_chat_mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Emoji Usage</span>
              <span className="capitalize">{model.emoji_usage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Response Length</span>
              <span className="capitalize">{model.response_length}</span>
            </div>
          </div>
        </div>

        {/* Persona */}
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles size={18} className="text-zinc-400" />
            Persona Details
          </h2>
          <div className="space-y-4 text-sm">
            {model.personality_traits?.length > 0 && (
              <div>
                <span className="text-zinc-400 block mb-2">Personality Traits</span>
                <div className="flex flex-wrap gap-2">
                  {model.personality_traits.map((trait, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {model.interests?.length > 0 && (
              <div>
                <span className="text-zinc-400 block mb-2">Interests</span>
                <div className="flex flex-wrap gap-2">
                  {model.interests.map((interest, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {model.backstory && (
              <div>
                <span className="text-zinc-400 block mb-1">Backstory</span>
                <p className="bg-zinc-800 p-3 rounded">{model.backstory}</p>
              </div>
            )}
            {model.speaking_style && (
              <div>
                <span className="text-zinc-400 block mb-1">Speaking Style</span>
                <p className="bg-zinc-800 p-3 rounded">{model.speaking_style}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Tag size={18} className="text-zinc-400" />
            Pricing & Tags
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Subscription Price</span>
              <span>£{(model.subscription_price / 100).toFixed(2)}/month</span>
            </div>
            {model.price_per_message && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Per Message</span>
                <span>{model.price_per_message} tokens</span>
              </div>
            )}

            {tags.length > 0 && (
              <div>
                <span className="text-zinc-400 block mb-2 mt-4">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      className={`
                        px-2 py-1 rounded text-xs
                        ${t.is_primary ? 'bg-pink-500/20 text-pink-400' : 'bg-zinc-700 text-zinc-300'}
                      `}
                    >
                      {t.tag?.name || t.tag_id}
                      {t.is_primary && ' (Primary)'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Samples */}
      {contentSamples.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Image size={18} className="text-zinc-400" />
            Content Samples ({contentSamples.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {contentSamples.map((content) => (
              <div key={content.id} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                <img
                  src={content.thumbnail_url || content.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {content.is_nsfw && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">
                      NSFW
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 bg-black/50 text-white text-xs rounded capitalize">
                    {content.visibility}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Physical Traits */}
      {model.physical_traits && Object.keys(model.physical_traits).length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Physical Traits</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(model.physical_traits).map(([key, value]) => (
              <div key={key}>
                <span className="text-zinc-400 block capitalize">{key.replace('_', ' ')}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creator Link */}
      <div className="flex justify-end">
        <Link
          href={`/admin/creators/${model.creator_id}`}
          className="text-purple-400 hover:underline text-sm"
        >
          View Creator Profile →
        </Link>
      </div>
    </div>
  );
}

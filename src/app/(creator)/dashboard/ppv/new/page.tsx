'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Lock,
  Image,
  Video,
  Check,
  Loader2,
  X,
} from 'lucide-react';

interface ContentItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  title?: string;
  visibility: string;
}

interface Model {
  id: string;
  name: string;
  avatar_url?: string;
}

export default function NewPPVPage() {
  const router = useRouter();

  const [models, setModels] = useState<Model[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    preview_url: '',
    price_tokens: 500,
    model_id: '',
    content_ids: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch models
      const modelsRes = await fetch('/api/creator/models');
      const modelsData = await modelsRes.json();
      if (modelsData.models) {
        setModels(modelsData.models.filter((m: Model & { status: string }) => m.status === 'approved'));
      }

      // Fetch content library
      const contentRes = await fetch('/api/creator/content');
      const contentData = await contentRes.json();
      if (contentData.items) {
        // Only show items not already in PPV
        setContentItems(contentData.items.filter((c: ContentItem) => c.visibility !== 'ppv'));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleContent = (contentId: string) => {
    setFormData(prev => {
      if (prev.content_ids.includes(contentId)) {
        return { ...prev, content_ids: prev.content_ids.filter(id => id !== contentId) };
      } else {
        return { ...prev, content_ids: [...prev.content_ids, contentId] };
      }
    });
  };

  const handleSubmit = async () => {
    setError(null);

    if (!formData.title) {
      setError('Title is required');
      return;
    }

    if (formData.content_ids.length === 0) {
      setError('Select at least one content item');
      return;
    }

    if (formData.price_tokens < 100) {
      setError('Minimum price is 100 tokens');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/creator/ppv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create PPV offer');
      }

      router.push('/dashboard/ppv');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  const priceInPounds = (formData.price_tokens / 250).toFixed(2);
  const creatorEarnings = ((formData.price_tokens * 0.7) / 250).toFixed(2);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/ppv"
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create PPV Offer</h1>
          <p className="text-zinc-400">Bundle content for one-time purchase</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Basic Info */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Offer Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                placeholder="e.g., Exclusive Photo Set, Behind the Scenes"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Describe what's included..."
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Preview Image URL (optional)</label>
              <input
                type="url"
                value={formData.preview_url}
                onChange={(e) => setFormData(prev => ({ ...prev, preview_url: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                placeholder="https://..."
              />
              <p className="text-xs text-zinc-500 mt-1">This image will be shown to non-purchasers</p>
            </div>

            {models.length > 0 && (
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Associated Model (optional)</label>
                <select
                  value={formData.model_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, model_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">No specific model</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Pricing</h2>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Price in Tokens *</label>
            <input
              type="number"
              min={100}
              step={50}
              value={formData.price_tokens}
              onChange={(e) => setFormData(prev => ({ ...prev, price_tokens: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
            />
            <div className="mt-2 text-sm text-zinc-400">
              <p>= £{priceInPounds} to fans</p>
              <p className="text-green-400">You earn: £{creatorEarnings} (70%)</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-sm text-zinc-300">
              <strong>Pricing guide:</strong> 250 tokens = £1
            </p>
            <ul className="text-sm text-zinc-400 mt-2 space-y-1">
              <li>• 250 tokens = £1 (small set)</li>
              <li>• 500 tokens = £2 (standard set)</li>
              <li>• 1,250 tokens = £5 (premium set)</li>
              <li>• 2,500 tokens = £10 (exclusive bundle)</li>
            </ul>
          </div>
        </section>

        {/* Content Selection */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            Select Content ({formData.content_ids.length} selected)
          </h2>

          {contentItems.length === 0 ? (
            <div className="text-center py-8">
              <Image size={48} className="mx-auto text-zinc-600 mb-4" />
              <p className="text-zinc-400">No content available</p>
              <p className="text-sm text-zinc-500 mt-1">
                Upload content to your library first
              </p>
              <Link
                href="/dashboard/content"
                className="inline-block mt-4 px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-700 transition-colors"
              >
                Go to Content Library
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {contentItems.map((item) => {
                const isSelected = formData.content_ids.includes(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => toggleContent(item.id)}
                    className={`
                      relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                      ${isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500/50'
                        : 'border-transparent hover:border-zinc-600'
                      }
                    `}
                  >
                    <img
                      src={item.thumbnail_url || item.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />

                    {/* Type Badge */}
                    <div className="absolute top-1 left-1">
                      {item.type === 'video' ? (
                        <Video size={14} className="text-white drop-shadow" />
                      ) : (
                        <Image size={14} className="text-white drop-shadow" />
                      )}
                    </div>

                    {/* Selected Overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-purple-500/30 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                          <Check size={18} className="text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Summary */}
        {formData.content_ids.length > 0 && (
          <section className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Items</span>
                <span>{formData.content_ids.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Price</span>
                <span>{formData.price_tokens} tokens (£{priceInPounds})</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>Your earnings</span>
                <span>£{creatorEarnings} per sale</span>
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard/ppv"
            className="px-6 py-3 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.title || formData.content_ids.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Creating...
              </>
            ) : (
              <>
                <Lock size={18} />
                Create PPV Offer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

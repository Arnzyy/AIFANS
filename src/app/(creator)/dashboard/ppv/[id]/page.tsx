'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Lock,
  DollarSign,
  Users,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Save,
} from 'lucide-react';

interface PPVOffer {
  id: string;
  title: string;
  description?: string;
  preview_url?: string;
  price_tokens: number;
  content_ids: string[];
  is_active: boolean;
  purchase_count: number;
  total_revenue: number;
  created_at: string;
  model_id?: string;
  model?: {
    name: string;
    avatar_url?: string;
  };
}

interface ContentItem {
  id: string;
  url: string;
  thumbnail_url?: string;
  type: string;
  title?: string;
}

export default function PPVDetailPage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.id as string;

  const [offer, setOffer] = useState<PPVOffer | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceTokens, setPriceTokens] = useState(0);

  useEffect(() => {
    fetchOffer();
  }, [offerId]);

  const fetchOffer = async () => {
    try {
      const res = await fetch(`/api/creator/ppv/${offerId}`);
      if (!res.ok) {
        throw new Error('Offer not found');
      }
      const data = await res.json();

      if (data.offer) {
        setOffer(data.offer);
        setTitle(data.offer.title);
        setDescription(data.offer.description || '');
        setPriceTokens(data.offer.price_tokens);
      }
      if (data.contentItems) {
        setContentItems(data.contentItems);
      }
    } catch (error) {
      console.error('Error fetching offer:', error);
      router.push('/dashboard/ppv');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!offer) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/creator/ppv/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price_tokens: priceTokens,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOffer(data.offer);
      }
    } catch (error) {
      console.error('Error saving offer:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!offer) return;

    try {
      const res = await fetch(`/api/creator/ppv/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !offer.is_active }),
      });

      if (res.ok) {
        setOffer({ ...offer, is_active: !offer.is_active });
      }
    } catch (error) {
      console.error('Error toggling offer:', error);
    }
  };

  const handleDelete = async () => {
    if (!offer || !confirm('Are you sure you want to delete this PPV offer?')) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/creator/ppv/${offerId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/dashboard/ppv');
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Offer not found</p>
        <Link href="/dashboard/ppv" className="text-purple-400 hover:underline mt-2 inline-block">
          Back to PPV
        </Link>
      </div>
    );
  }

  const priceGbp = (priceTokens / 250).toFixed(2);
  const revenueGbp = (offer.total_revenue / 250).toFixed(2);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/ppv"
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit PPV Offer</h1>
          <p className="text-zinc-400 text-sm">
            Created {new Date(offer.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleActive}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
              offer.is_active
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {offer.is_active ? (
              <>
                <ToggleRight size={18} />
                Active
              </>
            ) : (
              <>
                <ToggleLeft size={18} />
                Inactive
              </>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
            title="Delete offer"
          >
            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Users size={16} />
            <span className="text-sm">Sales</span>
          </div>
          <p className="text-xl font-bold">{offer.purchase_count}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <DollarSign size={16} />
            <span className="text-sm">Revenue</span>
          </div>
          <p className="text-xl font-bold">£{revenueGbp}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <ImageIcon size={16} />
            <span className="text-sm">Items</span>
          </div>
          <p className="text-xl font-bold">{offer.content_ids.length}</p>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-zinc-900 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Price (tokens)</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={priceTokens}
              onChange={(e) => setPriceTokens(parseInt(e.target.value) || 0)}
              min={100}
              step={50}
              className="w-40 px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <span className="text-zinc-400">= £{priceGbp}</span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">250 tokens = £1</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Content Preview */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="font-semibold mb-4">Included Content ({contentItems.length} items)</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {contentItems.map((item) => (
            <div
              key={item.id}
              className="aspect-square rounded-lg bg-zinc-800 overflow-hidden"
            >
              <img
                src={item.thumbnail_url || item.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <p className="text-sm text-zinc-500 mt-4">
          Content cannot be modified after creation. Create a new offer to change content.
        </p>
      </div>

      {/* Model Info */}
      {offer.model && (
        <div className="bg-zinc-900 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
            {offer.model.avatar_url && (
              <img src={offer.model.avatar_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <p className="text-sm text-zinc-400">Listed for</p>
            <p className="font-medium">{offer.model.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

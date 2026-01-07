'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Lock,
  DollarSign,
  Eye,
  Users,
  Trash2,
  ToggleLeft,
  ToggleRight,
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
  model?: {
    name: string;
    avatar_url?: string;
  };
}

export default function PPVPage() {
  const [offers, setOffers] = useState<PPVOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const res = await fetch('/api/creator/ppv');
      const data = await res.json();

      if (data.offers) {
        setOffers(data.offers);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (offerId: string, currentStatus: boolean) => {
    try {
      // TODO: Implement toggle API
      setOffers(offers.map(o =>
        o.id === offerId ? { ...o, is_active: !currentStatus } : o
      ));
    } catch (error) {
      console.error('Error toggling offer:', error);
    }
  };

  const totalRevenue = offers.reduce((sum, o) => sum + o.total_revenue, 0);
  const totalSales = offers.reduce((sum, o) => sum + o.purchase_count, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-800 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pay-Per-View Content</h1>
          <p className="text-zinc-400 mt-1">Create and manage PPV offers</p>
        </div>

        <Link
          href="/dashboard/ppv/new"
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus size={18} />
          Create PPV Offer
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <Lock size={18} />
            <span className="text-sm">Active Offers</span>
          </div>
          <p className="text-2xl font-bold">{offers.filter(o => o.is_active).length}</p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <Users size={18} />
            <span className="text-sm">Total Sales</span>
          </div>
          <p className="text-2xl font-bold">{totalSales}</p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="flex items-center gap-3 text-zinc-400 mb-2">
            <DollarSign size={18} />
            <span className="text-sm">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold">
            £{(totalRevenue / 250).toFixed(2)}
          </p>
          <p className="text-sm text-zinc-500">{totalRevenue} tokens</p>
        </div>
      </div>

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-12 text-center">
          <Lock size={48} className="mx-auto text-zinc-600 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No PPV Offers Yet</h2>
          <p className="text-zinc-400 mb-6">
            Create exclusive content packs that fans can purchase
          </p>
          <Link
            href="/dashboard/ppv/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={18} />
            Create Your First PPV Offer
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-zinc-900 rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  {/* Preview */}
                  <div className="w-24 h-24 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                    {offer.preview_url ? (
                      <img
                        src={offer.preview_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Lock size={24} className="text-zinc-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{offer.title}</h3>
                      {!offer.is_active && (
                        <span className="px-2 py-0.5 bg-zinc-700 text-zinc-400 text-xs rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {offer.description && (
                      <p className="text-sm text-zinc-400 mb-2">{offer.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span>{offer.content_ids.length} items</span>
                      <span>{offer.price_tokens} tokens (£{(offer.price_tokens / 250).toFixed(2)})</span>
                      {offer.model && (
                        <span>For: {offer.model.name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-semibold">{offer.purchase_count} sales</p>
                    <p className="text-sm text-zinc-400">
                      £{(offer.total_revenue / 250).toFixed(2)} earned
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(offer.id, offer.is_active)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                      title={offer.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {offer.is_active ? (
                        <ToggleRight size={24} className="text-green-400" />
                      ) : (
                        <ToggleLeft size={24} className="text-zinc-400" />
                      )}
                    </button>
                    <Link
                      href={`/dashboard/ppv/${offer.id}`}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Eye size={20} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <h3 className="font-medium mb-2">About PPV Content</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• Create exclusive content packs for one-time purchase</li>
          <li>• Set your own price in tokens (250 tokens = £1)</li>
          <li>• Fans purchase with their token balance</li>
          <li>• You earn 70% of each sale</li>
          <li>• PPV content is separate from subscription content</li>
        </ul>
      </div>
    </div>
  );
}

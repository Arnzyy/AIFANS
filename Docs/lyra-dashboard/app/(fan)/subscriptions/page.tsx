'use client';

import Link from 'next/link';
import { Heart, Search, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function SubscriptionsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Subscriptions</h1>
        <p className="text-gray-400 mt-1">Creators you're subscribed to</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Active
        </button>
        <button className="px-4 py-2 bg-zinc-900 text-gray-400 rounded-lg font-medium flex items-center gap-2 hover:text-white transition">
          <Clock className="w-4 h-4" />
          Expiring Soon
        </button>
        <button className="px-4 py-2 bg-zinc-900 text-gray-400 rounded-lg font-medium flex items-center gap-2 hover:text-white transition">
          <XCircle className="w-4 h-4" />
          Expired
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search subscriptions..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Empty State */}
      <div className="bg-zinc-900 rounded-xl p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <Heart className="w-10 h-10 text-pink-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">No subscriptions yet</h2>
        <p className="text-gray-400 mb-6">Subscribe to creators to see their exclusive content</p>
        <Link
          href="/browse"
          className="inline-block px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition"
        >
          Discover Creators
        </Link>
      </div>
    </div>
  );
}

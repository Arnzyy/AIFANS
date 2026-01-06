'use client';

import { Users, Search, Filter, TrendingUp, TrendingDown, DollarSign, UserCheck } from 'lucide-react';

export default function SubscribersPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Subscribers</h1>
        <p className="text-gray-400 mt-1">Manage your fan base</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-3xl font-bold">0</p>
          <p className="text-gray-400">Active</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-3xl font-bold">0</p>
          <p className="text-gray-400">Expired</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-3xl font-bold">£0</p>
          <p className="text-gray-400">Monthly Revenue</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-3xl font-bold">0%</p>
          <p className="text-gray-400">Retention</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search subscribers..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <button className="px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-bold">Active Subscribers</h2>
        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">0</span>
      </div>

      {/* Empty State */}
      <div className="bg-zinc-900 rounded-xl p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <Users className="w-10 h-10 text-purple-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">No active subscribers yet</h2>
        <p className="text-gray-400">Share your profile to get fans!</p>
      </div>
    </div>
  );
}

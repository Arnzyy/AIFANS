'use client';

import { TrendingUp, CreditCard, Bot, Lock, Users, Download } from 'lucide-react';

export default function EarningsPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Earnings</h1>
          <p className="text-gray-400 mt-1">Track your revenue</p>
        </div>
        <button className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6">
          <p className="text-gray-400 text-sm">This Month</p>
          <p className="text-3xl font-bold mt-1">£0.00</p>
          <p className="text-sm text-green-400 mt-2">↑ 0% from last month</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-6">
          <p className="text-gray-400 text-sm">All Time</p>
          <p className="text-3xl font-bold mt-1">£0.00</p>
          <p className="text-sm text-gray-500 mt-2">0 transactions</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-6">
          <p className="text-gray-400 text-sm">Available for Payout</p>
          <p className="text-3xl font-bold mt-1">£0.00</p>
          <button className="mt-2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-medium hover:opacity-90 transition">
            Request Payout
          </button>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-zinc-900 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">This Month Breakdown</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <span>Subscriptions</span>
            </div>
            <span className="font-medium">£0.00</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-yellow-500/20 flex items-center justify-center">
                <span className="text-yellow-500">💰</span>
              </div>
              <span>Tips</span>
            </div>
            <span className="font-medium">£0.00</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center">
                <Lock className="w-4 h-4 text-orange-400" />
              </div>
              <span>PPV Sales</span>
            </div>
            <span className="font-medium">£0.00</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
              <span>AI Chat</span>
            </div>
            <span className="font-medium">£0.00</span>
          </div>
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="flex items-center justify-between text-gray-400">
              <span>Platform fee (20%)</span>
              <span>-£0.00</span>
            </div>
            <div className="flex items-center justify-between font-bold text-lg">
              <span>Net earnings</span>
              <span className="text-green-400">£0.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="text-lg font-bold mb-4">Recent Transactions</h2>
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-gray-400">No transactions yet</p>
        </div>
      </div>
    </div>
  );
}

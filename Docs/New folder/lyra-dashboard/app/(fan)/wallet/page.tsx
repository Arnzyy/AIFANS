'use client';

import { useState } from 'react';
import { Wallet, CreditCard, Plus, History, Trash2 } from 'lucide-react';

export default function WalletPage() {
  const [showAddCard, setShowAddCard] = useState(false);

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-gray-400 mt-1">Manage your payment methods</p>
      </div>

      {/* Balance */}
      <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 mb-6">
        <p className="text-gray-400 text-sm">Wallet Balance</p>
        <p className="text-4xl font-bold mt-1">£0.00</p>
        <button className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-sm font-medium hover:bg-white/20 transition">
          Add Funds
        </button>
      </div>

      {/* Payment Methods */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Payment Methods</h2>
          <button
            onClick={() => setShowAddCard(true)}
            className="px-3 py-1.5 bg-purple-500 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-purple-600 transition"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        </div>

        {/* No cards */}
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400 mb-4">No payment methods added</p>
          <button
            onClick={() => setShowAddCard(true)}
            className="px-4 py-2 bg-purple-500 rounded-lg font-medium hover:bg-purple-600 transition"
          >
            Add Payment Method
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          Transaction History
        </h2>
        <div className="bg-zinc-900 rounded-xl p-8 text-center">
          <p className="text-gray-400">No transactions yet</p>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowAddCard(false)} />
          <div className="relative bg-zinc-900 rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-6">Add Payment Method</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Card Number</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CVC</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddCard(false)}
                  className="flex-1 py-2.5 bg-white/5 rounded-lg font-medium hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition">
                  Add Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

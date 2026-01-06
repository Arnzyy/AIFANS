'use client';

import { MessageCircle, Search, Filter } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-gray-400 mt-1">Chat with your subscribers</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <button className="px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-zinc-900 rounded-xl p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <MessageCircle className="w-10 h-10 text-gray-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">No messages yet</h2>
        <p className="text-gray-400">Your subscriber conversations will appear here</p>
      </div>
    </div>
  );
}

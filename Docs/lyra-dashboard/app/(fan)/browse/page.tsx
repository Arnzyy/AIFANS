'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Sparkles, TrendingUp, Clock, Star } from 'lucide-react';

// Mock creators for demo
const FEATURED_CREATORS = [
  {
    id: '1',
    name: 'Luna Rose',
    username: 'lunarose',
    avatar: null,
    bio: 'Your favorite night owl 🌙',
    subscribers: 1234,
    price: 9.99,
    hasAI: true,
  },
  {
    id: '2',
    name: 'Aria Belle',
    username: 'ariabelle',
    avatar: null,
    bio: 'Fitness & lifestyle ✨',
    subscribers: 856,
    price: 14.99,
    hasAI: true,
  },
  {
    id: '3',
    name: 'Jade Stone',
    username: 'jadestone',
    avatar: null,
    bio: 'Artist & dreamer 🎨',
    subscribers: 2341,
    price: 7.99,
    hasAI: false,
  },
];

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('featured');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Discover</h1>
        <p className="text-gray-400 mt-1">Find creators to follow</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <button className="px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[
          { id: 'featured', label: 'Featured', icon: Sparkles },
          { id: 'trending', label: 'Trending', icon: TrendingUp },
          { id: 'new', label: 'New', icon: Clock },
          { id: 'top', label: 'Top Rated', icon: Star },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition ${
              activeCategory === cat.id
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-900 text-gray-400 hover:text-white'
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Creator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURED_CREATORS.map((creator) => (
          <CreatorCard key={creator.id} creator={creator} />
        ))}
      </div>
    </div>
  );
}

function CreatorCard({ creator }: { creator: typeof FEATURED_CREATORS[0] }) {
  return (
    <Link
      href={`/@${creator.username}`}
      className="bg-zinc-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-purple-500 transition group"
    >
      {/* Cover */}
      <div className="h-24 bg-gradient-to-r from-purple-500/30 to-pink-500/30" />
      
      {/* Content */}
      <div className="p-4">
        {/* Avatar */}
        <div className="relative -mt-10 mb-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold border-4 border-zinc-900">
            {creator.name.charAt(0)}
          </div>
          {creator.hasAI && (
            <div className="absolute -right-1 bottom-0 px-1.5 py-0.5 bg-purple-500 rounded-full text-[10px] font-bold">
              AI
            </div>
          )}
        </div>

        {/* Info */}
        <h3 className="font-bold group-hover:text-purple-400 transition">{creator.name}</h3>
        <p className="text-sm text-gray-400 mb-2">@{creator.username}</p>
        <p className="text-sm text-gray-300 mb-4 line-clamp-2">{creator.bio}</p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{creator.subscribers.toLocaleString()} fans</span>
          <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
            £{creator.price}/mo
          </span>
        </div>
      </div>
    </Link>
  );
}

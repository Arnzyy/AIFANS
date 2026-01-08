'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles, Clock, TrendingUp, Bot, Gift, Plus, ArrowRight, BadgeCheck, Star } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  username: string;
  displayName: string;
  age: number;
  avatar: string;
  banner?: string;
  bio: string;
  subscriberCount: number;
  subscriptionPrice: number;
  hasAiChat: boolean;
  isNew: boolean;
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  modelType: 'lyra_original' | 'creator_model';
  creatorUsername?: string;
}

export default function ExplorePage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (category) params.set('category', category);

        const res = await fetch(`/api/models?${params.toString()}`);
        const data = await res.json();

        if (data.models) {
          setModels(data.models);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [searchQuery, category]);

  const categories = [
    { id: '', label: 'All', icon: Sparkles },
    { id: 'new', label: 'New', icon: Clock },
    { id: 'popular', label: 'Popular', icon: TrendingUp },
    { id: 'ai-chat', label: 'AI Chat', icon: Bot },
    { id: 'free', label: 'Free', icon: Gift },
  ];

  // Filter models client-side based on category
  let filteredModels = [...models];
  if (category === 'new') {
    filteredModels = filteredModels.filter(m => m.isNew);
  } else if (category === 'free') {
    filteredModels = filteredModels.filter(m => m.subscriptionPrice < 500);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Explore Models</h1>
        <p className="text-gray-400 mt-1">Discover AI companions and chat models</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
            className="w-full px-4 py-3 pl-12 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors text-base"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        </div>
      </div>

      {/* Become a Creator CTA */}
      <Link
        href="/become-creator"
        className="mb-6 flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Plus className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold">Become a Creator</h3>
            <p className="text-sm text-gray-400">Share your AI content and start earning</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
      </Link>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                category === cat.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-white/5 animate-pulse">
              <div className="aspect-[3/4] bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : filteredModels.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredModels.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold mb-2">No models found</h3>
          <p className="text-gray-400">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : 'Be the first to create a model!'}
          </p>
        </div>
      )}
    </div>
  );
}

function ModelCard({ model }: { model: Model }) {
  return (
    <Link
      href={`/model/${model.id}`}
      className="group block rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all hover:scale-[1.02]"
    >
      {/* Avatar as main image */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-purple-500/20 to-pink-500/20">
        {model.avatar ? (
          <img
            src={model.avatar}
            alt={model.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-purple-400">
            {model.name.charAt(0)}
          </div>
        )}

        {/* Badges - top-right corner */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {model.nsfw_enabled && (
            <div className="px-2 py-1 rounded-full bg-red-500/90 text-[10px] md:text-xs font-medium shadow-lg">
              NSFW
            </div>
          )}
          {model.hasAiChat && (
            <div className="px-2 py-1 rounded-full bg-black/80 backdrop-blur-sm text-[10px] md:text-xs flex items-center gap-1 shadow-lg border border-white/20">
              <Bot className="w-3 h-3 text-purple-400" />
              <span>AI</span>
            </div>
          )}
          {model.isNew && (
            <div className="px-2 py-1 rounded-full bg-green-500 text-[10px] md:text-xs font-medium shadow-lg">
              New
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-1">
            <h3 className="font-semibold truncate group-hover:text-purple-400 transition-colors">
              {model.displayName}
            </h3>
          </div>
          <p className="text-sm text-gray-400">Age: {model.age}</p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {model.subscriberCount.toLocaleString()} subscribers
            </span>
            <span className="text-sm font-medium text-purple-400">
              {model.subscriptionPrice > 0
                ? `£${(model.subscriptionPrice / 100).toFixed(2)}/mo`
                : 'Free'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

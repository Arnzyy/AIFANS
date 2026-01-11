'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Bot, BadgeCheck, MapPin, Heart, MessageCircle, Lock, Grid3X3, Play, Star, Sparkles, ArrowLeft } from 'lucide-react';
import { AI_CHAT_DISCLOSURE, MODEL_TYPES, CATEGORY_DISCLAIMER } from '@/lib/compliance/constants';
import { SubscribeModal } from '@/components/shared/SubscribeModal';
import { supabase } from '@/lib/supabase/client';
import { isAdminUser } from '@/lib/auth/admin';

interface Tag {
  id: string;
  name: string;
  category: string;
}

interface Model {
  id: string;
  name: string;
  displayName: string;
  age: number;
  bio: string;
  avatar: string;
  banner: string;
  subscriptionPrice: number;
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  hasAiChat: boolean;
  isNew: boolean;
  creatorUsername?: string;
  creatorDisplayName?: string;
  tags: Tag[];
}

export default function ModelProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [model, setModel] = useState<Model | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  useEffect(() => {
    const fetchModel = async () => {
      console.log('[ModelProfilePage] Fetching model with ID:', id);

      // Check if user is admin (full access to all content)
      const { data: { user } } = await supabase.auth.getUser();
      setIsAdmin(isAdminUser(user?.email));

      try {
        const res = await fetch(`/api/models/${id}`);
        console.log('[ModelProfilePage] API response status:', res.status);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error('[ModelProfilePage] API error:', res.status, errorData);
          if (res.status === 404) {
            setModel(null);
          }
          return;
        }
        const data = await res.json();
        console.log('[ModelProfilePage] Got model data:', data.model?.name);
        setModel(data.model);
        setIsSubscribed(data.isSubscribed);
      } catch (error) {
        console.error('[ModelProfilePage] Error fetching model:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModel();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-2">Model Not Found</h1>
        <p className="text-gray-400 mb-4">This model doesn't exist or hasn't been approved yet.</p>
        <button
          onClick={() => router.push('/explore')}
          className="px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const modelTypeInfo = MODEL_TYPES['creator_model'];

  // Check if user has access (subscribed or admin)
  const hasFullAccess = isSubscribed || isAdmin;

  // Mock posts based on model (will be replaced with real content)
  // First 2 posts are preview (free), rest require subscription
  const posts = Array.from({ length: 9 }, (_, i) => ({
    id: `${model.id}-${i}`,
    imageUrl: model.avatar,
    likes: Math.floor(Math.random() * 500) + 50,
    comments: Math.floor(Math.random() * 50) + 5,
    isLocked: i >= 2 && !hasFullAccess, // Lock content after first 2 unless subscribed/admin
    isVideo: i % 4 === 0,
  }));

  // Create tiers for subscribe modal
  const tiers = [
    {
      id: 'tier-1',
      name: 'Fan',
      description: 'Access to all posts and messages',
      price: model.subscriptionPrice,
      duration_months: 1,
      is_featured: true,
    }
  ];

  const handleMessage = () => {
    // Always navigate to chat - the chat page will show the welcome message
    // and handle access/subscribe prompts there (better UX to draw users in)
    const chatPath = `/chat/${model.id}`;
    console.log('[ModelProfilePage] Navigating to chat:', chatPath);
    router.push(chatPath);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Back button - positioned below header to avoid overlap with logo */}
      <div className="fixed top-20 left-4 z-40">
        <Link
          href="/explore"
          className="p-2 bg-black/50 backdrop-blur-xl rounded-full hover:bg-black/70 transition-colors inline-flex"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-purple-500/30 to-pink-500/30 overflow-hidden">
        {model.banner ? (
          <img
            src={model.banner}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={model.avatar}
            alt=""
            className="w-full h-full object-cover scale-110 blur-2xl opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Profile info */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-16 md:-mt-20 mb-6">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black overflow-hidden">
            {model.avatar ? (
              <img
                src={model.avatar}
                alt={model.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold">
                {model.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Action buttons - desktop */}
          <div className="hidden md:flex absolute right-0 bottom-0 gap-3">
            {model.hasAiChat && (
              <button
                onClick={handleMessage}
                className="px-6 py-2.5 rounded-lg bg-white/10 font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                Chat
              </button>
            )}
            <button
              onClick={() => setShowSubscribeModal(true)}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity"
            >
              Subscribe - £{(model.subscriptionPrice / 100).toFixed(2)}/mo
            </button>
          </div>
        </div>

        {/* Name & bio */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold">{model.displayName}</h1>
            {/* Model type badge */}
            <span className="px-2 py-1 text-xs text-white rounded-full font-medium flex items-center gap-1 bg-purple-500/80">
              <Sparkles className="w-3 h-3" />
              {modelTypeInfo.label}
            </span>
            {model.hasAiChat && (
              <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full flex items-center gap-1">
                <Bot className="w-3 h-3" />
                AI Chat
              </span>
            )}
            {model.nsfw_enabled && (
              <span className="px-2 py-1 text-xs bg-red-500/80 text-white rounded-full font-medium">
                NSFW
              </span>
            )}
            {model.isNew && (
              <span className="px-2 py-1 text-xs bg-green-500/80 text-white rounded-full font-medium">
                New
              </span>
            )}
          </div>

          {model.creatorUsername && (
            <p className="text-gray-500">by @{model.creatorUsername}</p>
          )}

          <p className="text-sm text-gray-400 mt-1">Age: {model.age}</p>

          {/* Disclosure - required but subtle */}
          <p className="text-xs text-gray-600 mt-2">
            Fictional AI-generated persona
          </p>

          <p className="mt-4 text-gray-300">{model.bio}</p>

          {/* Tags with disclaimer */}
          {model.tags && model.tags.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {model.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-3 py-1 text-xs bg-white/5 text-gray-400 rounded-full"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">{CATEGORY_DISCLAIMER}</p>
            </div>
          )}
        </div>

        {/* Mobile action buttons */}
        <div className="md:hidden flex gap-3 mb-6">
          {model.hasAiChat && (
            <button
              onClick={handleMessage}
              className="flex-1 py-3 rounded-lg bg-white/10 font-medium text-center hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
            >
              <Bot className="w-4 h-4" />
              Chat
            </button>
          )}
          <button
            onClick={() => setShowSubscribeModal(true)}
            className="flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity"
          >
            Subscribe
          </button>
        </div>

        {/* AI Chat CTA */}
        {model.hasAiChat && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">AI Chat Available</h3>
                <p className="text-sm text-gray-400 mt-1">{AI_CHAT_DISCLOSURE.medium}</p>
                <button
                  onClick={handleMessage}
                  className="inline-block mt-3 px-4 py-2 bg-purple-500 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                >
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription CTA */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <h3 className="text-xl font-bold mb-2">Subscribe to {model.displayName}</h3>
          <p className="text-gray-400 mb-4">
            Get full access to all posts, messages, and exclusive content
          </p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold">£{(model.subscriptionPrice / 100).toFixed(2)}</span>
              <span className="text-gray-500">/month</span>
            </div>
            <button
              onClick={() => setShowSubscribeModal(true)}
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 font-semibold hover:opacity-90 transition-opacity"
            >
              Subscribe Now
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Grid3X3 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Posts</h2>
          </div>

          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square bg-white/5 overflow-hidden group cursor-pointer"
              >
                <img
                  src={post.imageUrl}
                  alt=""
                  className={`w-full h-full object-cover ${post.isLocked ? 'blur-xl scale-110' : ''}`}
                />

                {/* Video indicator */}
                {post.isVideo && !post.isLocked && (
                  <div className="absolute top-2 right-2">
                    <Play className="w-5 h-5 fill-white" />
                  </div>
                )}

                {/* Locked overlay */}
                {post.isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Lock className="w-8 h-8 text-white/80" />
                  </div>
                )}

                {/* Hover overlay */}
                {!post.isLocked && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1 text-sm">
                      <Heart className="w-4 h-4 fill-white" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1 text-sm">
                      <MessageCircle className="w-4 h-4" />
                      {post.comments}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <SubscribeModal
          creator={{
            id: model.id,
            username: model.creatorUsername || model.id,
            display_name: model.displayName,
            avatar_url: model.avatar,
          }}
          tiers={tiers}
          chatPrice={999} // £9.99 default chat price
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => {
            setShowSubscribeModal(false);
            setIsSubscribed(true);
          }}
        />
      )}
    </div>
  );
}

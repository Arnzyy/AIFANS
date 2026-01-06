'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Calendar, Clock, Image, Lock, X } from 'lucide-react';

export default function PostsPage() {
  const [showNewPost, setShowNewPost] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Posts</h1>
          <p className="text-gray-400 mt-1">Manage your content</p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-3xl font-bold">0</p>
          <p className="text-gray-400">Published</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-3xl font-bold">0</p>
          <p className="text-gray-400">Scheduled</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <p className="text-3xl font-bold">0</p>
          <p className="text-gray-400">Drafts</p>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-zinc-900 rounded-xl p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <FileText className="w-10 h-10 text-gray-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">No posts yet</h2>
        <p className="text-gray-400 mb-6">Create your first post to start engaging with fans</p>
        <button
          onClick={() => setShowNewPost(true)}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition"
        >
          Create Post
        </button>
      </div>

      {/* New Post Modal */}
      {showNewPost && <NewPostModal onClose={() => setShowNewPost(false)} />}
    </div>
  );
}

function NewPostModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('');
  const [isPPV, setIsPPV] = useState(false);
  const [ppvPrice, setPpvPrice] = useState(4.99);
  const [isScheduled, setIsScheduled] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <button onClick={onClose} className="text-gray-400 hover:text-white flex items-center gap-2">
            ← Cancel
          </button>
          <h2 className="font-bold">New Post</h2>
          <button className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium text-sm hover:opacity-90 transition">
            Post
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500 resize-none mb-4"
          />
          <p className="text-right text-sm text-gray-500 mb-4">{content.length} / 2000</p>

          {/* Media Upload */}
          <div className="p-4 bg-zinc-800 rounded-xl mb-4 cursor-pointer hover:bg-zinc-750 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Image className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="font-medium">Add Photos or Videos</p>
                <p className="text-sm text-gray-400">Up to 10 files</p>
              </div>
            </div>
          </div>

          {/* PPV Toggle */}
          <div className="p-4 bg-zinc-800 rounded-xl mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium">Pay-Per-View</p>
                  <p className="text-sm text-gray-400">Charge fans to unlock this post</p>
                </div>
              </div>
              <button
                onClick={() => setIsPPV(!isPPV)}
                className={`w-12 h-6 rounded-full transition ${isPPV ? 'bg-purple-500' : 'bg-white/10'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isPPV ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            {isPPV && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-gray-400">£</span>
                <input
                  type="number"
                  min={0.99}
                  step={0.50}
                  value={ppvPrice}
                  onChange={(e) => setPpvPrice(parseFloat(e.target.value))}
                  className="w-24 px-3 py-1.5 bg-zinc-700 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>

          {/* Schedule Toggle */}
          <div className="p-4 bg-zinc-800 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Schedule Post</p>
                  <p className="text-sm text-gray-400">Post at a specific time</p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduled(!isScheduled)}
                className={`w-12 h-6 rounded-full transition ${isScheduled ? 'bg-purple-500' : 'bg-white/10'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isScheduled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            {isScheduled && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="px-3 py-2 bg-zinc-700 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <input
                  type="time"
                  className="px-3 py-2 bg-zinc-700 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

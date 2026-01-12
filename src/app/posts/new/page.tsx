'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function NewPostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPPV, setIsPPV] = useState(false);
  const [ppvPrice, setPpvPrice] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 10) {
      setError('Maximum 10 files per post');
      return;
    }

    // Create previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    
    setFiles(prev => [...prev, ...selectedFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
    setError('');
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && files.length === 0) {
      setError('Add some content or media to your post');
      return;
    }

    if (isPPV && (!ppvPrice || parseFloat(ppvPrice) < 1)) {
      setError('PPV price must be at least £1');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload files to R2
      const mediaUrls: string[] = [];

      for (const file of files) {
        // Get presigned URL from our API
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            type: 'post',
          }),
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Failed to get upload URL');
        }

        const { uploadUrl, publicUrl } = await uploadRes.json();

        // Upload to R2
        const r2Res = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!r2Res.ok) {
          throw new Error('Failed to upload file');
        }

        mediaUrls.push(publicUrl);
      }

      // Create post via API (handles RLS properly)
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: content.trim() || null,
          mediaUrls: mediaUrls, // Include the uploaded media!
          isPpv: isPPV,
          ppvPrice: isPPV ? Math.round(parseFloat(ppvPrice) * 100) : null,
          isPublished: !isScheduled,
          scheduledAt: isScheduled ? new Date(scheduleDate).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create post');
      }

      router.push('/dashboard/posts');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-16">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            ← Cancel
          </Link>
          <h1 className="font-semibold">New Post</h1>
          <button
            onClick={handleSubmit}
            disabled={loading || (!content.trim() && files.length === 0)}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Posting...' : isScheduled ? 'Schedule' : 'Post'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Content */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors resize-none"
            />
            <p className="text-right text-xs text-gray-500 mt-1">
              {content.length} / 2000
            </p>
          </div>

          {/* Media preview */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
                  <img 
                    src={preview} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Media upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 w-full p-4 rounded-xl bg-white/5 border border-white/10 border-dashed hover:border-purple-500/50 transition-colors"
            >
              <span className="text-2xl">📷</span>
              <div className="text-left">
                <p className="font-medium">Add Photos or Videos</p>
                <p className="text-sm text-gray-500">Up to 10 files</p>
              </div>
            </button>
          </div>

          {/* PPV Toggle */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="font-medium">Pay-Per-View</p>
                  <p className="text-sm text-gray-500">Charge fans to unlock this post</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isPPV}
                  onChange={(e) => setIsPPV(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${isPPV ? 'bg-purple-500' : 'bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${isPPV ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>

            {isPPV && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="block text-sm font-medium mb-2">Price (£)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={ppvPrice}
                  onChange={(e) => setPpvPrice(e.target.value)}
                  placeholder="5.00"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                />
              </div>
            )}
          </div>

          {/* Schedule Toggle */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="font-medium">Schedule Post</p>
                  <p className="text-sm text-gray-500">Post at a specific time</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${isScheduled ? 'bg-purple-500' : 'bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${isScheduled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>

            {isScheduled && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="block text-sm font-medium mb-2">Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                />
              </div>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

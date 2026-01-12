'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Post {
  id: string;
  text_content: string | null;
  media_urls: string[];
  is_ppv: boolean;
  ppv_price: number | null;
  is_published: boolean;
  scheduled_at: string | null;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState('');
  const [existingMedia, setExistingMedia] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [isPPV, setIsPPV] = useState(false);
  const [ppvTokens, setPpvTokens] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  // Token to GBP conversion (250 tokens = £1)
  const ppvPriceGbp = ppvTokens ? (parseInt(ppvTokens) / 250).toFixed(2) : '0.00';
  const [scheduleDate, setScheduleDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) {
        throw new Error('Post not found');
      }
      const data = await res.json();
      const p = data.post;

      setPost(p);
      setContent(p.text_content || '');
      setExistingMedia(p.media_urls || []);
      setIsPPV(p.is_ppv || false);
      // Convert pence to tokens (pence / 100 * 250 = pence * 2.5)
      setPpvTokens(p.ppv_price ? Math.round(p.ppv_price * 2.5).toString() : '');
      setIsScheduled(!!p.scheduled_at && !p.is_published);
      setScheduleDate(p.scheduled_at ? new Date(p.scheduled_at).toISOString().slice(0, 16) : '');
    } catch (err: any) {
      setError(err.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const totalFiles = existingMedia.length + newFiles.length + selectedFiles.length;

    if (totalFiles > 10) {
      setError('Maximum 10 files per post');
      return;
    }

    const newFilePreviews = selectedFiles.map(file => URL.createObjectURL(file));

    setNewFiles(prev => [...prev, ...selectedFiles]);
    setNewPreviews(prev => [...prev, ...newFilePreviews]);
    setError('');
  };

  const removeExistingMedia = (index: number) => {
    setExistingMedia(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() && existingMedia.length === 0 && newFiles.length === 0) {
      setError('Add some content or media to your post');
      return;
    }

    if (isPPV && (!ppvTokens || parseInt(ppvTokens) < 100)) {
      setError('PPV price must be at least 100 tokens');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Upload new files to R2
      const newMediaUrls: string[] = [];

      for (const file of newFiles) {
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

        const r2Res = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!r2Res.ok) {
          throw new Error('Failed to upload file');
        }

        newMediaUrls.push(publicUrl);
      }

      // Combine existing and new media
      const allMediaUrls = [...existingMedia, ...newMediaUrls];

      // Update post via API
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: content.trim() || null,
          mediaUrls: allMediaUrls,
          isPpv: isPPV,
          ppvPrice: isPPV ? Math.round((parseInt(ppvTokens) / 250) * 100) : null, // Convert tokens to pence
          isPublished: !isScheduled,
          scheduledAt: isScheduled ? new Date(scheduleDate).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update post');
      }

      router.push('/dashboard/posts');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Post not found</p>
          <Link href="/dashboard/posts" className="text-purple-400 hover:text-purple-300">
            Back to Posts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-16">
          <Link href="/dashboard/posts" className="text-gray-400 hover:text-white transition-colors">
            Cancel
          </Link>
          <h1 className="font-semibold">Edit Post</h1>
          <button
            onClick={handleSubmit}
            disabled={saving || (!content.trim() && existingMedia.length === 0 && newFiles.length === 0)}
            className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
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

          {/* Existing Media */}
          {existingMedia.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Current Media</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {existingMedia.map((url, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingMedia(index)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Media preview */}
          {newPreviews.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">New Media</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {newPreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
                    <img
                      src={preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewFile(index)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
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
              <span className="text-2xl">+</span>
              <div className="text-left">
                <p className="font-medium">Add More Media</p>
                <p className="text-sm text-gray-500">Up to 10 files total</p>
              </div>
            </button>
          </div>

          {/* PPV Toggle */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-2xl">$</span>
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
                <label className="block text-sm font-medium mb-2">Price (tokens)</label>
                <input
                  type="number"
                  min="100"
                  step="1"
                  value={ppvTokens}
                  onChange={(e) => setPpvTokens(e.target.value)}
                  placeholder="500"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                />
                <p className="text-sm text-gray-400 mt-2">
                  = £{ppvPriceGbp} <span className="text-gray-500">(250 tokens = £1)</span>
                </p>
              </div>
            )}
          </div>

          {/* Schedule Toggle */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-2xl">T</span>
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

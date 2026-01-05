'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/shared/Toast';

export default function NewPostPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isPPV, setIsPPV] = useState(false);
  const [ppvPrice, setPpvPrice] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 10) {
      addToast('error', 'Maximum 10 files per post');
      return;
    }

    // Create previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    
    setFiles(prev => [...prev, ...selectedFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && files.length === 0) {
      addToast('error', 'Add some content or media to your post');
      return;
    }

    if (isPPV && (!ppvPrice || parseFloat(ppvPrice) < 1)) {
      addToast('error', 'PPV price must be at least £1');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload files first
      const mediaUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          creator_id: user.id,
          text_content: content.trim() || null,
          is_ppv: isPPV,
          ppv_price: isPPV ? Math.round(parseFloat(ppvPrice) * 100) : null,
          is_published: !isScheduled,
          scheduled_at: isScheduled ? new Date(scheduleDate).toISOString() : null,
        });

      if (postError) throw postError;

      addToast('success', 'Post created successfully!');
      router.push('/dashboard/posts');
      router.refresh();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create post');
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
            {loading ? (uploadProgress > 0 ? `${uploadProgress}%` : 'Posting...') : isScheduled ? 'Schedule' : 'Post'}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">

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

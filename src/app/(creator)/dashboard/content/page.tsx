'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Trash2,
  Eye,
  Lock,
  Globe,
  Users,
  Loader2,
  X,
  Check,
  Filter,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ContentItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  visibility: 'public' | 'subscribers' | 'ppv';
  is_nsfw: boolean;
  view_count: number;
  like_count: number;
  created_at: string;
  model?: {
    id: string;
    name: string;
  };
}

type VisibilityFilter = 'all' | 'public' | 'subscribers' | 'ppv';

export default function ContentLibraryPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filter, setFilter] = useState<VisibilityFilter>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/creator/content');
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList) => {
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    const supabase = createClient();
    const totalFiles = files.length;
    let completed = 0;

    try {
      for (const file of Array.from(files)) {
        // Validate file
        if (file.size > 50 * 1024 * 1024) {
          setError(`${file.name} is too large. Max 50MB.`);
          continue;
        }

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
          setError(`${file.name} is not a valid image or video.`);
          continue;
        }

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `content/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('content')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setError(`Failed to upload ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('content')
          .getPublicUrl(uploadData.path);

        // Create content item in database
        const res = await fetch('/api/creator/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: isVideo ? 'video' : 'image',
            url: urlData.publicUrl,
            title: file.name.replace(/\.[^/.]+$/, ''),
            visibility: 'subscribers',
            is_nsfw: false,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to save content');
          continue;
        }

        completed++;
        setUploadProgress(Math.round((completed / totalFiles) * 100));
      }

      // Refresh content list
      await fetchContent();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Delete this content? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/creator/content/${itemId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setItems(items.filter(i => i.id !== itemId));
        setSelectedItems(selectedItems.filter(id => id !== itemId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedItems.length} items? This cannot be undone.`)) return;

    for (const id of selectedItems) {
      await handleDelete(id);
    }
    setSelectedItems([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredItems = filter === 'all'
    ? items
    : items.filter(i => i.visibility === filter);

  const visibilityIcon = {
    public: Globe,
    subscribers: Users,
    ppv: Lock,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Library</h1>
          <p className="text-zinc-400 mt-1">Upload and manage your images and videos</p>
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Uploading {uploadProgress}%
            </>
          ) : (
            <>
              <Upload size={18} />
              Upload Content
            </>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-zinc-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as VisibilityFilter)}
            className="px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-sm"
          >
            <option value="all">All Content</option>
            <option value="public">Public</option>
            <option value="subscribers">Subscribers Only</option>
            <option value="ppv">PPV</option>
          </select>
        </div>

        {selectedItems.length > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">
              {selectedItems.length} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedItems([])}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <ImageIcon size={16} />
            <span className="text-sm">Images</span>
          </div>
          <p className="text-xl font-bold">{items.filter(i => i.type === 'image').length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Video size={16} />
            <span className="text-sm">Videos</span>
          </div>
          <p className="text-xl font-bold">{items.filter(i => i.type === 'video').length}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Eye size={16} />
            <span className="text-sm">Total Views</span>
          </div>
          <p className="text-xl font-bold">{items.reduce((sum, i) => sum + i.view_count, 0)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Lock size={16} />
            <span className="text-sm">PPV Items</span>
          </div>
          <p className="text-xl font-bold">{items.filter(i => i.visibility === 'ppv').length}</p>
        </div>
      </div>

      {/* Content Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-12 text-center">
          <ImageIcon size={48} className="mx-auto text-zinc-600 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Content Yet</h2>
          <p className="text-zinc-400 mb-6">
            Upload images and videos to use in your profile and PPV offers
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <Upload size={18} />
            Upload Your First Content
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => {
            const VisIcon = visibilityIcon[item.visibility];
            const isSelected = selectedItems.includes(item.id);

            return (
              <div
                key={item.id}
                className={`
                  relative group rounded-lg overflow-hidden bg-zinc-900 border-2 transition-all
                  ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-transparent'}
                `}
              >
                {/* Thumbnail */}
                <div className="aspect-square relative">
                  <img
                    src={item.thumbnail_url || item.url}
                    alt={item.title || ''}
                    className="w-full h-full object-cover"
                  />

                  {/* Select Checkbox */}
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className={`
                      absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all
                      ${isSelected
                        ? 'bg-purple-500 border-purple-500'
                        : 'bg-black/50 border-white/50 opacity-0 group-hover:opacity-100'
                      }
                    `}
                  >
                    {isSelected && <Check size={14} />}
                  </button>

                  {/* Type Badge */}
                  <div className="absolute top-2 right-2">
                    {item.type === 'video' ? (
                      <Video size={16} className="text-white drop-shadow" />
                    ) : (
                      <ImageIcon size={16} className="text-white drop-shadow" />
                    )}
                  </div>

                  {/* NSFW Badge */}
                  {item.is_nsfw && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-red-500/80 text-white text-xs rounded">
                      NSFW
                    </div>
                  )}

                  {/* Visibility Badge */}
                  <div className="absolute bottom-2 right-2">
                    <VisIcon size={16} className="text-white drop-shadow" />
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Link
                      href={`/dashboard/content/${item.id}`}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    >
                      <Eye size={18} />
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-red-500/50 hover:bg-red-500/70 rounded-full transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-sm truncate">{item.title || 'Untitled'}</p>
                  <p className="text-xs text-zinc-500">{item.view_count} views</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
          }
        }}
        className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-zinc-600 transition-colors"
      >
        <Upload size={32} className="mx-auto text-zinc-500 mb-3" />
        <p className="text-zinc-400">Drag and drop files here</p>
        <p className="text-sm text-zinc-500 mt-1">or click the Upload button above</p>
        <p className="text-xs text-zinc-600 mt-2">Max 50MB per file • Images and videos only</p>
      </div>
    </div>
  );
}

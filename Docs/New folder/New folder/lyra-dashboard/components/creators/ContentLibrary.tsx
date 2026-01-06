'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Plus,
  X,
  Check,
  Loader2,
  DollarSign,
  Users,
  Tag,
  Grid,
  List,
  Filter,
  Search,
  MoreVertical,
  Send,
  Package,
} from 'lucide-react';
import { ContentItem, Post, PPVOffer, ContentVisibility, formatGBP } from '@/lib/creators/types';

// ===========================================
// CONTENT LIBRARY
// ===========================================

interface ContentLibraryProps {
  modelId: string;
  creatorId: string;
}

export function ContentLibrary({ modelId, creatorId }: ContentLibraryProps) {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<ContentVisibility | 'ALL'>('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchContent();
  }, [modelId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/creator/models/${modelId}/content`);
      const data = await response.json();
      setContent(data.content || []);
    } catch (err) {
      console.error('Failed to fetch content');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList, visibility: ContentVisibility, isNsfw: boolean) => {
    setUploading(true);
    try {
      // In production, upload to Supabase Storage
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model_id', modelId);
        formData.append('visibility', visibility);
        formData.append('is_nsfw', String(isNsfw));

        await fetch('/api/creator/content/upload', {
          method: 'POST',
          body: formData,
        });
      }
      
      await fetchContent();
      setShowUploadModal(false);
    } catch (err) {
      console.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm('Delete this content?')) return;

    try {
      await fetch(`/api/creator/content/${contentId}`, { method: 'DELETE' });
      setContent((prev) => prev.filter((c) => c.id !== contentId));
      setSelectedItems((prev) => prev.filter((id) => id !== contentId));
    } catch (err) {
      console.error('Delete failed');
    }
  };

  const handleVisibilityChange = async (contentId: string, visibility: ContentVisibility) => {
    try {
      await fetch(`/api/creator/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });
      setContent((prev) =>
        prev.map((c) => (c.id === contentId ? { ...c, visibility } : c))
      );
    } catch (err) {
      console.error('Update failed');
    }
  };

  const toggleSelect = (contentId: string) => {
    setSelectedItems((prev) =>
      prev.includes(contentId)
        ? prev.filter((id) => id !== contentId)
        : [...prev, contentId]
    );
  };

  const filteredContent = content.filter(
    (c) => filter === 'ALL' || c.visibility === filter
  );

  const getTypeIcon = (type: ContentItem['type']) => {
    switch (type) {
      case 'IMAGE':
        return ImageIcon;
      case 'VIDEO':
        return Video;
      case 'TEXT':
        return FileText;
      default:
        return ImageIcon;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Content Library</h2>
          <p className="text-sm text-gray-400">{content.length} items</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedItems.length > 0 && (
            <span className="text-sm text-purple-400">{selectedItems.length} selected</span>
          )}
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4 p-3 bg-zinc-900 rounded-lg">
        <div className="flex gap-2">
          {(['ALL', 'PUBLIC_PREVIEW', 'SUBSCRIBERS', 'PPV'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm transition ${
                filter === f
                  ? 'bg-purple-500 text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'PUBLIC_PREVIEW' ? 'Public' : f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-zinc-700' : 'hover:bg-zinc-800'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-zinc-700' : 'hover:bg-zinc-800'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No content yet</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm"
          >
            Upload your first content
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredContent.map((item) => (
            <ContentGridItem
              key={item.id}
              item={item}
              selected={selectedItems.includes(item.id)}
              onSelect={() => toggleSelect(item.id)}
              onDelete={() => handleDelete(item.id)}
              onVisibilityChange={(v) => handleVisibilityChange(item.id, v)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContent.map((item) => (
            <ContentListItem
              key={item.id}
              item={item}
              selected={selectedItems.includes(item.id)}
              onSelect={() => toggleSelect(item.id)}
              onDelete={() => handleDelete(item.id)}
              onVisibilityChange={(v) => handleVisibilityChange(item.id, v)}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          uploading={uploading}
        />
      )}

      {/* Create PPV from Selection */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 p-4 bg-zinc-900 rounded-xl shadow-xl border border-white/10 flex items-center gap-4">
          <span className="text-sm">{selectedItems.length} items selected</span>
          <button
            onClick={() => setSelectedItems([])}
            className="px-3 py-1.5 bg-zinc-700 rounded text-sm"
          >
            Clear
          </button>
          <button className="px-4 py-1.5 bg-purple-500 rounded text-sm font-medium flex items-center gap-2">
            <Package className="w-4 h-4" />
            Create PPV
          </button>
        </div>
      )}
    </div>
  );
}

// ===========================================
// CONTENT GRID ITEM
// ===========================================

function ContentGridItem({
  item,
  selected,
  onSelect,
  onDelete,
  onVisibilityChange,
}: {
  item: ContentItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onVisibilityChange: (v: ContentVisibility) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const TypeIcon = item.type === 'VIDEO' ? Video : item.type === 'TEXT' ? FileText : ImageIcon;

  return (
    <div
      className={`relative aspect-square bg-zinc-800 rounded-lg overflow-hidden group cursor-pointer ${
        selected ? 'ring-2 ring-purple-500' : ''
      }`}
      onClick={onSelect}
    >
      {item.thumbnail_url || item.storage_url ? (
        <img
          src={item.thumbnail_url || item.storage_url}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <TypeIcon className="w-8 h-8 text-gray-600" />
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
        <div className="flex items-center gap-2">
          {selected && <Check className="w-6 h-6 text-purple-400" />}
        </div>
      </div>

      {/* Badges */}
      <div className="absolute top-2 left-2 flex gap-1">
        {item.is_nsfw && (
          <span className="px-1.5 py-0.5 bg-pink-500 rounded text-[10px] font-bold">18+</span>
        )}
        <VisibilityBadge visibility={item.visibility} />
      </div>

      {/* Menu */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="absolute top-2 right-2 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {showMenu && (
        <div
          className="absolute top-8 right-2 bg-zinc-900 rounded-lg shadow-xl border border-white/10 py-1 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onVisibilityChange('PUBLIC_PREVIEW');
              setShowMenu(false);
            }}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
          >
            Make Public
          </button>
          <button
            onClick={() => {
              onVisibilityChange('SUBSCRIBERS');
              setShowMenu(false);
            }}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-white/5"
          >
            Subscribers Only
          </button>
          <button
            onClick={() => {
              onDelete();
              setShowMenu(false);
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-white/5"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ===========================================
// CONTENT LIST ITEM
// ===========================================

function ContentListItem({
  item,
  selected,
  onSelect,
  onDelete,
  onVisibilityChange,
}: {
  item: ContentItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onVisibilityChange: (v: ContentVisibility) => void;
}) {
  const TypeIcon = item.type === 'VIDEO' ? Video : item.type === 'TEXT' ? FileText : ImageIcon;

  return (
    <div
      className={`flex items-center gap-4 p-3 bg-zinc-900 rounded-lg cursor-pointer ${
        selected ? 'ring-2 ring-purple-500' : 'hover:bg-zinc-800'
      }`}
      onClick={onSelect}
    >
      <div className="w-16 h-16 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
        {item.thumbnail_url || item.storage_url ? (
          <img src={item.thumbnail_url || item.storage_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="w-6 h-6 text-gray-600" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.filename || 'Untitled'}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{item.type}</span>
          {item.file_size && (
            <span className="text-xs text-gray-500">
              {(item.file_size / 1024 / 1024).toFixed(1)} MB
            </span>
          )}
          <VisibilityBadge visibility={item.visibility} />
          {item.is_nsfw && (
            <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 rounded text-[10px]">NSFW</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={item.visibility}
          onChange={(e) => onVisibilityChange(e.target.value as ContentVisibility)}
          onClick={(e) => e.stopPropagation()}
          className="px-2 py-1 bg-zinc-800 rounded text-xs border border-white/10"
        >
          <option value="PUBLIC_PREVIEW">Public</option>
          <option value="SUBSCRIBERS">Subscribers</option>
          <option value="PPV">PPV</option>
        </select>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 hover:bg-red-500/20 rounded text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ===========================================
// VISIBILITY BADGE
// ===========================================

function VisibilityBadge({ visibility }: { visibility: ContentVisibility }) {
  const config = {
    PUBLIC_PREVIEW: { icon: Eye, color: 'bg-green-500/20 text-green-400', label: 'Public' },
    SUBSCRIBERS: { icon: Users, color: 'bg-blue-500/20 text-blue-400', label: 'Subs' },
    PPV: { icon: Lock, color: 'bg-yellow-500/20 text-yellow-400', label: 'PPV' },
  };

  const { icon: Icon, color, label } = config[visibility];

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ===========================================
// UPLOAD MODAL
// ===========================================

function UploadModal({
  onClose,
  onUpload,
  uploading,
}: {
  onClose: () => void;
  onUpload: (files: FileList, visibility: ContentVisibility, isNsfw: boolean) => void;
  uploading: boolean;
}) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [visibility, setVisibility] = useState<ContentVisibility>('SUBSCRIBERS');
  const [isNsfw, setIsNsfw] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      setFiles(e.dataTransfer.files);
    }
  }, []);

  const handleSubmit = () => {
    if (files) {
      onUpload(files, visibility, isNsfw);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Upload Content</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
            dragActive
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-white/20 hover:border-white/30'
          }`}
        >
          {files ? (
            <div>
              <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="font-medium">{files.length} file(s) selected</p>
              <button
                onClick={() => setFiles(null)}
                className="text-sm text-gray-400 hover:text-white mt-2"
              >
                Change files
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 mb-2">Drag and drop files here, or</p>
              <label className="inline-block px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg cursor-pointer">
                Browse Files
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => setFiles(e.target.files)}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>

        {/* Options */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {(['PUBLIC_PREVIEW', 'SUBSCRIBERS', 'PPV'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={`p-2 rounded-lg text-sm transition ${
                    visibility === v
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {v === 'PUBLIC_PREVIEW' ? 'Public' : v === 'SUBSCRIBERS' ? 'Subscribers' : 'PPV'}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={isNsfw}
              onChange={(e) => setIsNsfw(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">NSFW Content</span>
              <p className="text-sm text-gray-400">Mark as adult content</p>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!files || uploading}
            className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// PPV MANAGER
// ===========================================

interface PPVManagerProps {
  modelId: string;
  creatorId: string;
}

export function PPVManager({ modelId, creatorId }: PPVManagerProps) {
  const [ppvOffers, setPpvOffers] = useState<PPVOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPPVOffers();
  }, [modelId]);

  const fetchPPVOffers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/creator/models/${modelId}/ppv`);
      const data = await response.json();
      setPpvOffers(data.offers || []);
    } catch (err) {
      console.error('Failed to fetch PPV offers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Partial<PPVOffer>) => {
    try {
      const response = await fetch(`/api/creator/models/${modelId}/ppv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchPPVOffers();
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error('Failed to create PPV');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">PPV Content</h2>
          <p className="text-sm text-gray-400">Create and manage pay-per-view content packs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create PPV
        </button>
      </div>

      {/* PPV List */}
      {ppvOffers.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900 rounded-xl">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">No PPV content yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm"
          >
            Create your first PPV
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ppvOffers.map((ppv) => (
            <PPVCard key={ppv.id} ppv={ppv} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePPVModal
          modelId={modelId}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// ===========================================
// PPV CARD
// ===========================================

function PPVCard({ ppv }: { ppv: PPVOffer }) {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      {/* Preview */}
      <div className="aspect-video bg-zinc-800 relative">
        {ppv.preview_url ? (
          <img src={ppv.preview_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-600" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            ppv.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'
          }`}>
            {ppv.status}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold mb-1">{ppv.title}</h3>
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{ppv.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm font-medium">
              {ppv.price_tokens} tokens
            </span>
            <span className="text-sm text-gray-500">
              ({formatGBP(ppv.price_gbp_minor)})
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {ppv.purchase_count} sales
          </span>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// CREATE PPV MODAL
// ===========================================

function CreatePPVModal({
  modelId,
  onClose,
  onCreate,
}: {
  modelId: string;
  onClose: () => void;
  onCreate: (data: Partial<PPVOffer>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceTokens, setPriceTokens] = useState(500);
  const [subscribersOnly, setSubscribersOnly] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    await onCreate({
      title,
      description,
      price_tokens: priceTokens,
      subscribers_only: subscribersOnly,
      content_item_ids: [], // In production, allow selecting content
    });
    
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Create PPV</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Exclusive Photo Set"
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what's included..."
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Price (Tokens)</label>
            <input
              type="number"
              value={priceTokens}
              onChange={(e) => setPriceTokens(parseInt(e.target.value) || 0)}
              min={100}
              step={50}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              ≈ {formatGBP(Math.round((priceTokens / 250) * 100))}
            </p>
          </div>

          <label className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={subscribersOnly}
              onChange={(e) => setSubscribersOnly(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Subscribers Only</span>
              <p className="text-sm text-gray-400">Only subscribers can purchase</p>
            </div>
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title || creating}
              className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create PPV
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

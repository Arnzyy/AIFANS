'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';

interface FileUploadProps {
  bucket: string;
  folder?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  onUpload: (urls: string[]) => void;
  className?: string;
}

export function FileUpload({
  bucket,
  folder = '',
  accept = 'image/*,video/*',
  multiple = true,
  maxFiles = 10,
  onUpload,
  className = '',
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    if (files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);

    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      onUpload(uploadedUrls);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      // Clear previews on error
      setPreviews([]);
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePreview = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
      />

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
              <img 
                src={preview} 
                alt="" 
                className="w-full h-full object-cover"
              />
              {!uploading && (
                <button
                  type="button"
                  onClick={() => removePreview(index)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  ✕
                </button>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-sm">{progress}%</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-3 w-full p-4 rounded-xl bg-white/5 border border-white/10 border-dashed hover:border-purple-500/50 transition-colors disabled:opacity-50"
      >
        <span className="text-2xl">{uploading ? '⏳' : '📷'}</span>
        <div className="text-left">
          <p className="font-medium">
            {uploading ? `Uploading... ${progress}%` : 'Add Photos or Videos'}
          </p>
          <p className="text-sm text-gray-500">
            {multiple ? `Up to ${maxFiles} files` : '1 file'}
          </p>
        </div>
      </button>
    </div>
  );
}

// Simple avatar/single image upload
export function AvatarUpload({
  bucket,
  folder = 'avatars',
  currentUrl,
  onUpload,
  className = '',
}: {
  bucket: string;
  folder?: string;
  currentUrl?: string;
  onUpload: (url: string) => void;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onUpload(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative w-24 h-24 rounded-full bg-white/10 overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all group"
      >
        {currentUrl ? (
          <img src={currentUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
        )}
        
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span>{uploading ? '...' : '📷'}</span>
        </div>
      </button>
    </div>
  );
}

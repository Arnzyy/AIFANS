'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  uploadType?: 'avatar' | 'banner' | 'post' | 'message';
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  aspectRatio?: 'square' | 'banner' | 'portrait';
  placeholder?: string;
  disabled?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  folder = 'uploads',
  uploadType = 'avatar',
  accept = 'image/*',
  maxSize = 10,
  className = '',
  aspectRatio = 'square',
  placeholder = 'Click to upload or drag and drop',
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectClasses = {
    square: 'aspect-square',
    banner: 'aspect-[3/1]',
    portrait: 'aspect-[3/4]',
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please upload an image or video file');
      return;
    }

    setUploading(true);

    try {
      // Step 1: Get presigned upload URL from API
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          type: uploadType,
        }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json();
        throw new Error(data.error || 'Failed to get upload URL');
      }

      const { uploadUrl, publicUrl } = await presignRes.json();

      // Step 2: Upload file directly to R2 using presigned URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload to storage');
      }

      // Step 3: Return the public URL
      onChange(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className={className}>
      <div
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border-2 border-dashed transition-colors cursor-pointer overflow-hidden
          ${aspectClasses[aspectRatio]}
          ${dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 hover:border-zinc-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${value ? 'border-solid border-zinc-700' : ''}
        `}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              className="w-full h-full object-cover"
            />
            {!disabled && onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            {uploading ? (
              <>
                <Loader2 className="animate-spin text-purple-500 mb-2" size={32} />
                <span className="text-sm text-zinc-400">Uploading...</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                  {dragActive ? (
                    <Upload className="text-purple-400" size={24} />
                  ) : (
                    <ImageIcon className="text-zinc-400" size={24} />
                  )}
                </div>
                <span className="text-sm text-zinc-400">{placeholder}</span>
                <span className="text-xs text-zinc-500 mt-1">Max {maxSize}MB</span>
              </>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={disabled || uploading}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}

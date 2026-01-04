import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateUploadFilename } from '@/lib/utils';

// ===========================================
// R2/S3 CLIENT
// ===========================================

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// ===========================================
// UPLOAD FUNCTIONS
// ===========================================

interface UploadResult {
  key: string;
  url: string;
}

// Upload file buffer directly
export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  folder: string = 'uploads'
): Promise<UploadResult> {
  const filename = generateUploadFilename(originalFilename);
  const key = `${folder}/${filename}`;
  
  const contentType = getContentType(originalFilename);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: `${PUBLIC_URL}/${key}`,
  };
}

// Upload from File/Blob (for client-side)
export async function uploadBlob(
  blob: Blob,
  originalFilename: string,
  folder: string = 'uploads'
): Promise<UploadResult> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return uploadFile(buffer, originalFilename, folder);
}

// Generate presigned URL for direct upload from browser
export async function getPresignedUploadUrl(
  filename: string,
  folder: string = 'uploads',
  expiresIn: number = 3600
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const key = `${folder}/${generateUploadFilename(filename)}`;
  const contentType = getContentType(filename);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return {
    uploadUrl,
    key,
    publicUrl: `${PUBLIC_URL}/${key}`,
  };
}

// ===========================================
// DELETE FUNCTIONS
// ===========================================

export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );
}

export async function deleteFileByUrl(url: string): Promise<void> {
  const key = url.replace(`${PUBLIC_URL}/`, '');
  await deleteFile(key);
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    // Documents
    pdf: 'application/pdf',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

// Generate thumbnail URL (if using Cloudflare Image Resizing)
export function getThumbnailUrl(url: string, width: number = 400): string {
  // If using Cloudflare Image Resizing
  // return `${url}?width=${width}&fit=cover`;
  
  // For now, return original
  return url;
}

// ===========================================
// FOLDER STRUCTURE
// ===========================================

// Suggested folder structure:
// - avatars/{user_id}/
// - banners/{user_id}/
// - posts/{creator_id}/{post_id}/
// - messages/{conversation_id}/
// - temp/ (for processing, auto-cleaned)

export function getAvatarPath(userId: string): string {
  return `avatars/${userId}`;
}

export function getBannerPath(userId: string): string {
  return `banners/${userId}`;
}

export function getPostMediaPath(creatorId: string, postId: string): string {
  return `posts/${creatorId}/${postId}`;
}

export function getMessageMediaPath(conversationId: string): string {
  return `messages/${conversationId}`;
}

// LYRA Moderation Integration Helper
// Use this when integrating moderation into upload flows

import { createModerationScan, TargetType } from './index';

/**
 * Queue a new upload for moderation scanning
 * Call this after successful upload to R2
 */
export async function queueUploadForModeration(params: {
  targetType: TargetType;
  targetId: string;        // ID of the content/model
  modelId?: string;        // Model ID (for consistency checking)
  creatorId: string;       // Creator ID
  r2Key: string;           // R2 object key
  r2Url: string;           // Public or signed URL
  priority?: number;       // 1 = highest, 10 = lowest
}): Promise<string> {
  return createModerationScan({
    target_type: params.targetType,
    target_id: params.targetId,
    model_id: params.modelId,
    creator_id: params.creatorId,
    r2_key: params.r2Key,
    r2_url: params.r2Url,
    priority: params.priority,
  });
}

/**
 * Example integration for model profile image upload
 */
export async function onModelProfileUpload(
  modelId: string,
  creatorId: string,
  r2Key: string,
  r2Url: string
): Promise<string> {
  return queueUploadForModeration({
    targetType: 'model_profile',
    targetId: modelId,
    modelId: modelId,
    creatorId: creatorId,
    r2Key: r2Key,
    r2Url: r2Url,
    priority: 3, // Higher priority for profile images
  });
}

/**
 * Example integration for gallery content upload
 */
export async function onGalleryUpload(
  contentId: string,
  modelId: string,
  creatorId: string,
  r2Key: string,
  r2Url: string
): Promise<string> {
  return queueUploadForModeration({
    targetType: 'model_gallery',
    targetId: contentId,
    modelId: modelId,
    creatorId: creatorId,
    r2Key: r2Key,
    r2Url: r2Url,
    priority: 5, // Normal priority
  });
}

/**
 * Example integration for PPV content upload
 */
export async function onPPVUpload(
  ppvId: string,
  modelId: string,
  creatorId: string,
  r2Key: string,
  r2Url: string
): Promise<string> {
  return queueUploadForModeration({
    targetType: 'ppv_content',
    targetId: ppvId,
    modelId: modelId,
    creatorId: creatorId,
    r2Key: r2Key,
    r2Url: r2Url,
    priority: 5,
  });
}

/**
 * Example integration for model onboarding
 * Run this when a new model is created
 */
export async function onModelOnboarding(
  modelId: string,
  creatorId: string,
  profileImageKey: string,
  profileImageUrl: string
): Promise<string> {
  return queueUploadForModeration({
    targetType: 'onboarding',
    targetId: modelId,
    modelId: modelId,
    creatorId: creatorId,
    r2Key: profileImageKey,
    r2Url: profileImageUrl,
    priority: 2, // High priority for onboarding
  });
}

// ============================================
// Usage Example in Upload API Route
// ============================================

/*
// In your existing upload API route:

import { onGalleryUpload } from '@/lib/moderation/integration';

export async function POST(request: NextRequest) {
  // ... existing upload logic ...
  
  // After successful R2 upload:
  const r2Key = 'models/abc123/gallery/image.jpg';
  const r2Url = `https://your-bucket.r2.cloudflarestorage.com/${r2Key}`;
  
  // Queue for moderation
  const scanId = await onGalleryUpload(
    contentId,
    modelId,
    creatorId,
    r2Key,
    r2Url
  );
  
  // Return with pending status
  return NextResponse.json({
    success: true,
    contentId,
    scanId,
    status: 'pending_scan',
    message: 'Upload successful. Content is being reviewed.',
  });
}
*/

// ============================================
// Creator-Facing Status Check
// ============================================

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function getCreatorUploadStatus(scanId: string, creatorId: string) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data } = await supabase
    .from('content_moderation_scans')
    .select('id, status, created_at')
    .eq('id', scanId)
    .eq('creator_id', creatorId)
    .single();

  if (!data) {
    return null;
  }

  // Return simplified status (no scores for creators)
  const statusMessages: Record<string, string> = {
    pending_scan: 'Processing...',
    scanning: 'Checking content...',
    approved: 'Approved',
    pending_review: 'Under review',
    rejected: 'Not approved',
    failed: 'Error - please retry',
  };

  return {
    id: data.id,
    status: data.status,
    message: statusMessages[data.status] || data.status,
    created_at: data.created_at,
  };
}

// LYRA Moderation Integration Helper
// Use this when integrating moderation into upload flows

import { createModerationScan } from './moderation-service';
import { TargetType } from './types';
import { createClient } from '@supabase/supabase-js';

/**
 * Queue a new upload for moderation scanning
 * Call this after successful upload to R2
 */
export async function queueUploadForModeration(params: {
  targetType: TargetType;
  targetId: string; // ID of the content/model
  modelId?: string; // Model ID (for consistency checking)
  creatorId: string; // Creator ID
  r2Key: string; // R2 object key
  r2Url: string; // Public or signed URL
  priority?: number; // 1 = highest, 10 = lowest
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
// Creator-Facing Status Check
// ============================================

// Lazy-loaded Supabase admin client to avoid build-time errors
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDb(): any {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
}

export async function getCreatorUploadStatus(scanId: string, creatorId: string) {
  const { data } = await getDb()
    .from('content_moderation_scans')
    .select('id, status, created_at')
    .eq('id', scanId)
    .eq('creator_id', creatorId)
    .single();

  if (!data) {
    return null;
  }

  // Type assertion for the data
  const scanData = data as { id: string; status: string; created_at: string };

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
    id: scanData.id,
    status: scanData.status,
    message: statusMessages[scanData.status] || scanData.status,
    created_at: scanData.created_at,
  };
}

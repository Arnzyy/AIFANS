// LYRA Virtual Moderation Staff Member - Types

export type ModerationStatus = 
  | 'pending_scan' 
  | 'scanning' 
  | 'approved' 
  | 'pending_review' 
  | 'rejected' 
  | 'failed';

export type TargetType = 
  | 'model_profile' 
  | 'model_gallery' 
  | 'model_cover' 
  | 'ppv_content' 
  | 'chat_media' 
  | 'onboarding';

export type JobTargetType = 
  | 'model_onboarding' 
  | 'content_upload' 
  | 'bulk_rescan';

export type JobStatus = 
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type ReviewAction = 
  | 'approved' 
  | 'rejected' 
  | 'escalated';

export type ModerationFlag = 
  | 'face_drift'
  | 'celeb_risk'
  | 'celeb_high_confidence'
  | 'real_person_suspected'
  | 'faceswap_suspected'
  | 'deepfake_detected'
  | 'minor_appearance_risk'
  | 'youth_coded_appearance'
  | 'no_face_detected'
  | 'multiple_faces'
  | 'low_quality_image'
  | 'no_anchors'
  | 'insufficient_anchors'
  | 'style_inconsistency'
  | 'ai_generated_confirmed'
  | 'real_photo_suspected';

// ============================================
// Database Models
// ============================================

export interface ModelAnchor {
  id: string;
  model_id: string;
  r2_key: string;
  r2_url?: string;
  created_at: string;
  created_by?: string;
  note?: string;
  is_active: boolean;
}

export interface ContentModerationScan {
  id: string;
  target_type: TargetType;
  target_id: string;
  model_id?: string;
  creator_id: string;
  r2_key: string;
  r2_url?: string;
  status: ModerationStatus;
  
  // Scores
  face_consistency_score?: number;
  celebrity_risk_score?: number;
  real_person_risk_score?: number;
  deepfake_risk_score?: number;
  minor_risk_score?: number;
  
  // Results
  flags: ModerationFlag[];
  staff_summary?: string;
  scan_confidence?: number;
  
  // Scan metadata
  scanned_at?: string;
  scan_duration_ms?: number;
  scan_model?: string;
  raw_response?: any;
  
  // Review
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  review_action?: ReviewAction;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ModerationJob {
  id: string;
  target_type: JobTargetType;
  target_id: string;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  last_error?: string;
  last_attempt_at?: string;
  completed_at?: string;
  worker_id?: string;
  started_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ModerationSettings {
  id: string;
  
  // Auto-approve thresholds
  auto_approve_max_celebrity_risk: number;
  auto_approve_min_face_consistency: number;
  auto_approve_max_deepfake_risk: number;
  auto_approve_max_real_person_risk: number;
  
  // Auto-reject thresholds
  auto_reject_min_minor_risk: number;
  
  // Review thresholds
  review_min_celebrity_risk: number;
  review_min_face_consistency_drop: number;
  review_min_deepfake_risk: number;
  
  // Feature flags
  enabled: boolean;
  scan_on_upload: boolean;
  scan_on_onboarding: boolean;
  require_anchors_for_consistency: boolean;
  
  // Limits
  max_anchors_per_model: number;
  min_anchors_for_consistency: number;
  
  updated_at: string;
  updated_by?: string;
}

export interface ModerationAuditLog {
  id: string;
  scan_id?: string;
  model_id?: string;
  creator_id?: string;
  actor_id?: string;
  actor_type: 'system' | 'admin' | 'moderator';
  action: string;
  previous_status?: string;
  new_status?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================
// Vision Model Response
// ============================================

export interface VisionScanResult {
  face_consistency_score: number;
  celebrity_risk_score: number;
  real_person_risk_score: number;
  deepfake_risk_score: number;
  minor_risk_score: number;
  flags: ModerationFlag[];
  confidence: number;
  staff_summary: string;
}

// ============================================
// API Types
// ============================================

export interface CreateScanRequest {
  target_type: TargetType;
  target_id: string;
  model_id?: string;
  creator_id: string;
  r2_key: string;
  r2_url?: string;
  priority?: number;
}

export interface ScanResult {
  scan_id: string;
  status: ModerationStatus;
  scores?: {
    face_consistency: number;
    celebrity_risk: number;
    real_person_risk: number;
    deepfake_risk: number;
    minor_risk: number;
  };
  flags: ModerationFlag[];
  summary?: string;
}

export interface ReviewRequest {
  scan_id: string;
  action: ReviewAction;
  notes?: string;
  add_as_anchor?: boolean;
}

export interface PendingModerationItem extends ContentModerationScan {
  model_name?: string;
  model_avatar?: string;
  creator_name?: string;
  creator_email?: string;
  anchor_count?: number;
  anchors?: ModelAnchor[];
}

// ============================================
// Admin Dashboard Types
// ============================================

export interface ModerationStats {
  pending_scans: number;
  pending_reviews: number;
  approved_today: number;
  rejected_today: number;
  flagged_celebrity: number;
  flagged_minor: number;
  avg_scan_time_ms: number;
}

export interface ModerationQueueFilters {
  status?: ModerationStatus;
  target_type?: TargetType;
  has_flag?: ModerationFlag;
  min_risk_score?: number;
  creator_id?: string;
  model_id?: string;
  date_from?: string;
  date_to?: string;
}

// ============================================
// Creator-Facing Types (Limited Info)
// ============================================

export interface CreatorUploadStatus {
  id: string;
  status: 'scanning' | 'approved' | 'pending_review' | 'rejected';
  message: string;
  created_at: string;
}

export const STATUS_MESSAGES: Record<ModerationStatus, string> = {
  pending_scan: 'Processing upload...',
  scanning: 'Checking content...',
  approved: 'Approved',
  pending_review: 'Under review for compliance',
  rejected: 'Content not approved',
  failed: 'Processing error - please retry',
};

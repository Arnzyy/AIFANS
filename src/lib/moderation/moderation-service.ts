// LYRA Virtual Moderation Staff Member - Core Service

import { createClient } from '@supabase/supabase-js';
import {
  ModelAnchor,
  ModerationSettings,
  ModerationStatus,
  VisionScanResult,
  CreateScanRequest,
  ModerationFlag,
} from './types';

// ============================================
// Configuration
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service client with admin privileges for background jobs
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// Settings Cache
// ============================================

let settingsCache: ModerationSettings | null = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60000; // 1 minute

async function getSettings(): Promise<ModerationSettings> {
  const now = Date.now();
  if (settingsCache && now - settingsCacheTime < SETTINGS_CACHE_TTL) {
    return settingsCache;
  }

  const { data, error } = await supabaseAdmin
    .from('moderation_settings')
    .select('*')
    .single();

  if (error || !data) {
    // Return defaults if settings not found
    return {
      id: 'default',
      auto_approve_max_celebrity_risk: 30,
      auto_approve_min_face_consistency: 70,
      auto_approve_max_deepfake_risk: 30,
      auto_approve_max_real_person_risk: 40,
      auto_reject_min_minor_risk: 70,
      review_min_celebrity_risk: 50,
      review_min_face_consistency_drop: 50,
      review_min_deepfake_risk: 50,
      enabled: true,
      scan_on_upload: true,
      scan_on_onboarding: true,
      require_anchors_for_consistency: true,
      max_anchors_per_model: 10,
      min_anchors_for_consistency: 3,
      updated_at: new Date().toISOString(),
    };
  }

  settingsCache = data as ModerationSettings;
  settingsCacheTime = now;
  return settingsCache;
}

// ============================================
// Scan Creation
// ============================================

export async function createModerationScan(request: CreateScanRequest): Promise<string> {
  const settings = await getSettings();

  if (!settings.enabled) {
    // If moderation disabled, auto-approve
    const { data, error } = await supabaseAdmin
      .from('content_moderation_scans')
      .insert({
        ...request,
        status: 'approved',
        staff_summary: 'Moderation bypassed - system disabled',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  // Create scan record
  const { data: scan, error: scanError } = await supabaseAdmin
    .from('content_moderation_scans')
    .insert({
      target_type: request.target_type,
      target_id: request.target_id,
      model_id: request.model_id,
      creator_id: request.creator_id,
      r2_key: request.r2_key,
      r2_url: request.r2_url,
      status: 'pending_scan',
      flags: [],
    })
    .select('id')
    .single();

  if (scanError) throw scanError;

  // Create job
  const { error: jobError } = await supabaseAdmin
    .from('moderation_jobs')
    .insert({
      target_type: request.target_type === 'onboarding' ? 'model_onboarding' : 'content_upload',
      target_id: scan.id,
      priority: request.priority || 5,
    });

  if (jobError) {
    console.error('Failed to create moderation job:', jobError);
  }

  return scan.id;
}

// ============================================
// Anchor Management
// ============================================

export async function getModelAnchors(modelId: string): Promise<ModelAnchor[]> {
  const { data, error } = await supabaseAdmin
    .from('model_anchors')
    .select('*')
    .eq('model_id', modelId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching anchors:', error);
    return [];
  }

  return data || [];
}

export async function addModelAnchor(
  modelId: string,
  r2Key: string,
  r2Url: string,
  createdBy: string,
  note?: string
): Promise<ModelAnchor> {
  const settings = await getSettings();

  // Check anchor limit
  const existingAnchors = await getModelAnchors(modelId);
  if (existingAnchors.length >= settings.max_anchors_per_model) {
    throw new Error(`Maximum ${settings.max_anchors_per_model} anchors per model`);
  }

  const { data, error } = await supabaseAdmin
    .from('model_anchors')
    .insert({
      model_id: modelId,
      r2_key: r2Key,
      r2_url: r2Url,
      created_by: createdBy,
      note,
    })
    .select()
    .single();

  if (error) throw error;

  // Log action
  await logModerationAction({
    model_id: modelId,
    actor_id: createdBy,
    actor_type: 'admin',
    action: 'anchor_added',
    details: { r2_key: r2Key },
  });

  return data;
}

export async function removeModelAnchor(anchorId: string, removedBy: string): Promise<void> {
  const { data: anchor } = await supabaseAdmin
    .from('model_anchors')
    .select('model_id')
    .eq('id', anchorId)
    .single();

  const { error } = await supabaseAdmin
    .from('model_anchors')
    .update({ is_active: false })
    .eq('id', anchorId);

  if (error) throw error;

  if (anchor) {
    await logModerationAction({
      model_id: anchor.model_id,
      actor_id: removedBy,
      actor_type: 'admin',
      action: 'anchor_removed',
      details: { anchor_id: anchorId },
    });
  }
}

// ============================================
// Vision Analysis
// ============================================

const VISION_PROMPT = `You are a content moderation assistant for an adult AI companion platform. Analyze this image and return ONLY a JSON object with no markdown formatting.

CONTEXT:
- This platform features AI-generated fictional characters (not real people)
- All characters must be clearly adult (18+)
- No real celebrities or identifiable real people allowed
- Face consistency matters for recurring characters

ANCHOR IMAGES (if provided):
These are approved baseline images for this character. Compare the new image to these for consistency.

ANALYZE FOR:
1. face_consistency_score (0-100): How well does this match the anchor images? 100 = perfect match. If no anchors provided, set to 0 and add "no_anchors" flag.

2. celebrity_risk_score (0-100): Does this resemble any real celebrity or public figure? 0 = no resemblance, 100 = clearly identifiable celebrity.

3. real_person_risk_score (0-100): Does this appear to be a real photograph of a real person (not AI-generated)? 0 = clearly AI/artistic, 100 = definitely a real photo.

4. deepfake_risk_score (0-100): Are there signs of face-swapping, deepfake artifacts, or manipulation? 0 = no signs, 100 = clear deepfake.

5. minor_risk_score (0-100): Does the subject appear under 18 or have youth-coded appearance? This is CRITICAL. 0 = clearly adult, 100 = appears to be a minor. Consider facial features, body proportions, styling, and context.

FLAGS to include when appropriate:
- "face_drift" - significant difference from anchors
- "celeb_risk" - resembles a celebrity (score >= 50)
- "celeb_high_confidence" - strongly resembles a specific celebrity (score >= 80)
- "real_person_suspected" - appears to be a real photo
- "faceswap_suspected" - shows signs of face manipulation
- "deepfake_detected" - clear deepfake indicators
- "minor_appearance_risk" - any concern about age appearance
- "youth_coded_appearance" - styling/presentation suggests youth
- "no_face_detected" - no clear face in image
- "multiple_faces" - more than one person
- "low_quality_image" - too low quality to assess
- "no_anchors" - no baseline images to compare
- "style_inconsistency" - art style differs from anchors
- "ai_generated_confirmed" - clearly AI-generated
- "real_photo_suspected" - appears to be a real photograph

RESPOND WITH ONLY THIS JSON (no markdown, no explanation):
{
  "face_consistency_score": <number 0-100>,
  "celebrity_risk_score": <number 0-100>,
  "real_person_risk_score": <number 0-100>,
  "deepfake_risk_score": <number 0-100>,
  "minor_risk_score": <number 0-100>,
  "flags": [<array of applicable flag strings>],
  "confidence": <number 0-100 indicating your confidence in this assessment>,
  "staff_summary": "<brief 1-2 sentence explanation of key findings, neutral tone>"
}`;

export async function runVisionScan(
  imageUrl: string,
  anchorUrls: string[] = []
): Promise<VisionScanResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Build content array with images
  const content: any[] = [{ type: 'text', text: VISION_PROMPT }];

  // Add anchors first if available
  if (anchorUrls.length > 0) {
    content.push({
      type: 'text',
      text: `ANCHOR IMAGES (${anchorUrls.length} baseline references for this character):`,
    });

    for (let i = 0; i < Math.min(anchorUrls.length, 4); i++) {
      content.push({
        type: 'image',
        source: {
          type: 'url',
          url: anchorUrls[i],
        },
      });
    }

    content.push({
      type: 'text',
      text: 'NEW IMAGE TO ANALYZE:',
    });
  }

  // Add the image to analyze
  content.push({
    type: 'image',
    source: {
      type: 'url',
      url: imageUrl,
    },
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: content,
          },
        ],
      }),
    });

    const data = await response.json();
    const responseText = data.content?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]) as VisionScanResult;

    // Validate and sanitize
    return {
      face_consistency_score: clamp(result.face_consistency_score || 0, 0, 100),
      celebrity_risk_score: clamp(result.celebrity_risk_score || 0, 0, 100),
      real_person_risk_score: clamp(result.real_person_risk_score || 0, 0, 100),
      deepfake_risk_score: clamp(result.deepfake_risk_score || 0, 0, 100),
      minor_risk_score: clamp(result.minor_risk_score || 0, 0, 100),
      flags: (result.flags || []).filter((f) => isValidFlag(f)),
      confidence: clamp(result.confidence || 50, 0, 100),
      staff_summary: result.staff_summary || 'Analysis complete.',
    };
  } catch (error: any) {
    console.error('Vision scan error:', error);

    // Return safe defaults on error
    return {
      face_consistency_score: 0,
      celebrity_risk_score: 0,
      real_person_risk_score: 0,
      deepfake_risk_score: 0,
      minor_risk_score: 0,
      flags: ['low_quality_image'],
      confidence: 0,
      staff_summary: `Scan failed: ${error.message}`,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isValidFlag(flag: string): flag is ModerationFlag {
  const validFlags: ModerationFlag[] = [
    'face_drift',
    'celeb_risk',
    'celeb_high_confidence',
    'real_person_suspected',
    'faceswap_suspected',
    'deepfake_detected',
    'minor_appearance_risk',
    'youth_coded_appearance',
    'no_face_detected',
    'multiple_faces',
    'low_quality_image',
    'no_anchors',
    'insufficient_anchors',
    'style_inconsistency',
    'ai_generated_confirmed',
    'real_photo_suspected',
  ];
  return validFlags.includes(flag as ModerationFlag);
}

// ============================================
// Status Determination
// ============================================

export async function determineStatus(
  result: VisionScanResult,
  hasAnchors: boolean
): Promise<ModerationStatus> {
  const settings = await getSettings();

  // CRITICAL: Auto-reject for minor risk
  if (result.minor_risk_score >= settings.auto_reject_min_minor_risk) {
    return 'rejected';
  }

  // Check for flags that require review
  const criticalFlags: ModerationFlag[] = [
    'minor_appearance_risk',
    'youth_coded_appearance',
    'celeb_high_confidence',
    'deepfake_detected',
  ];

  if (result.flags.some((f) => criticalFlags.includes(f))) {
    return 'pending_review';
  }

  // Check thresholds for pending review
  if (
    result.celebrity_risk_score >= settings.review_min_celebrity_risk ||
    result.deepfake_risk_score >= settings.review_min_deepfake_risk ||
    (hasAnchors &&
      result.face_consistency_score <= settings.review_min_face_consistency_drop)
  ) {
    return 'pending_review';
  }

  // Check for auto-approve eligibility
  const canAutoApprove =
    result.celebrity_risk_score <= settings.auto_approve_max_celebrity_risk &&
    result.deepfake_risk_score <= settings.auto_approve_max_deepfake_risk &&
    result.real_person_risk_score <= settings.auto_approve_max_real_person_risk &&
    result.minor_risk_score < 30 && // Extra safety margin
    (!hasAnchors ||
      result.face_consistency_score >= settings.auto_approve_min_face_consistency);

  if (canAutoApprove) {
    return 'approved';
  }

  // Default to pending review if uncertain
  return 'pending_review';
}

// ============================================
// Process Scan Job
// ============================================

export async function processScanJob(scanId: string): Promise<void> {
  const startTime = Date.now();

  // Get scan record
  const { data: scan, error: scanError } = await supabaseAdmin
    .from('content_moderation_scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (scanError || !scan) {
    throw new Error(`Scan not found: ${scanId}`);
  }

  // Update status to scanning
  await supabaseAdmin
    .from('content_moderation_scans')
    .update({ status: 'scanning' })
    .eq('id', scanId);

  try {
    // Get anchor images if model exists
    let anchors: ModelAnchor[] = [];
    if (scan.model_id) {
      anchors = await getModelAnchors(scan.model_id);
    }

    const anchorUrls = anchors
      .filter((a) => a.r2_url)
      .map((a) => a.r2_url!)
      .slice(0, 4);

    // Run vision scan
    const result = await runVisionScan(scan.r2_url || scan.r2_key, anchorUrls);

    // Add no_anchors flag if applicable
    if (anchors.length === 0 && !result.flags.includes('no_anchors')) {
      result.flags.push('no_anchors');
    }

    const settings = await getSettings();
    if (
      anchors.length > 0 &&
      anchors.length < settings.min_anchors_for_consistency &&
      !result.flags.includes('insufficient_anchors')
    ) {
      result.flags.push('insufficient_anchors');
    }

    // Determine final status
    const status = await determineStatus(
      result,
      anchors.length >= settings.min_anchors_for_consistency
    );

    const scanDuration = Date.now() - startTime;

    // Update scan record
    await supabaseAdmin
      .from('content_moderation_scans')
      .update({
        status,
        face_consistency_score: result.face_consistency_score,
        celebrity_risk_score: result.celebrity_risk_score,
        real_person_risk_score: result.real_person_risk_score,
        deepfake_risk_score: result.deepfake_risk_score,
        minor_risk_score: result.minor_risk_score,
        flags: result.flags,
        staff_summary: result.staff_summary,
        scan_confidence: result.confidence,
        scanned_at: new Date().toISOString(),
        scan_duration_ms: scanDuration,
        scan_model: 'claude-sonnet-4-20250514',
        raw_response: result,
      })
      .eq('id', scanId);

    // Log the scan completion
    await logModerationAction({
      scan_id: scanId,
      model_id: scan.model_id,
      creator_id: scan.creator_id,
      actor_type: 'system',
      action: 'scan_completed',
      new_status: status,
      details: {
        scores: {
          face_consistency: result.face_consistency_score,
          celebrity_risk: result.celebrity_risk_score,
          real_person_risk: result.real_person_risk_score,
          deepfake_risk: result.deepfake_risk_score,
          minor_risk: result.minor_risk_score,
        },
        flags: result.flags,
        duration_ms: scanDuration,
      },
    });

    // Alert admins for critical flags
    if (
      result.minor_risk_score >= 50 ||
      result.flags.includes('minor_appearance_risk') ||
      result.flags.includes('youth_coded_appearance')
    ) {
      await alertAdmins(scanId, 'CRITICAL: Minor risk detected', result);
    }
  } catch (error: any) {
    console.error('Scan processing failed:', error);

    await supabaseAdmin
      .from('content_moderation_scans')
      .update({
        status: 'failed',
        staff_summary: `Scan failed: ${error.message}`,
        scanned_at: new Date().toISOString(),
        scan_duration_ms: Date.now() - startTime,
      })
      .eq('id', scanId);

    throw error;
  }
}

// ============================================
// Admin Actions
// ============================================

export async function reviewScan(
  scanId: string,
  reviewerId: string,
  action: 'approved' | 'rejected' | 'escalated',
  notes?: string,
  addAsAnchor?: boolean
): Promise<void> {
  const { data: scan } = await supabaseAdmin
    .from('content_moderation_scans')
    .select('*')
    .eq('id', scanId)
    .single();

  if (!scan) {
    throw new Error('Scan not found');
  }

  const previousStatus = scan.status;
  const newStatus: ModerationStatus =
    action === 'escalated' ? 'pending_review' : action;

  await supabaseAdmin
    .from('content_moderation_scans')
    .update({
      status: newStatus,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
      review_action: action,
    })
    .eq('id', scanId);

  // Add as anchor if requested and approved
  if (addAsAnchor && action === 'approved' && scan.model_id && scan.r2_url) {
    await addModelAnchor(
      scan.model_id,
      scan.r2_key,
      scan.r2_url,
      reviewerId,
      'Added during review approval'
    );
  }

  // Log the action
  await logModerationAction({
    scan_id: scanId,
    model_id: scan.model_id,
    creator_id: scan.creator_id,
    actor_id: reviewerId,
    actor_type: 'admin',
    action: `review_${action}`,
    previous_status: previousStatus,
    new_status: newStatus,
    details: { notes, added_as_anchor: addAsAnchor },
  });
}

// ============================================
// Utilities
// ============================================

interface ModerationAuditLogEntry {
  scan_id?: string;
  model_id?: string;
  creator_id?: string;
  actor_id?: string;
  actor_type: 'system' | 'admin' | 'moderator';
  action: string;
  previous_status?: string;
  new_status?: string;
  details?: any;
}

async function logModerationAction(entry: ModerationAuditLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from('moderation_audit_log').insert(entry);
  } catch (error) {
    console.error('Failed to log moderation action:', error);
  }
}

async function alertAdmins(
  scanId: string,
  subject: string,
  result: VisionScanResult
): Promise<void> {
  // TODO: Implement admin notification (email, Slack, etc.)
  console.warn(`[ADMIN ALERT] ${subject}`, { scanId, result });
}

// ============================================
// Stats
// ============================================

export async function getModerationStats(): Promise<any> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabaseAdmin.rpc('get_moderation_stats', {
    start_date: today.toISOString(),
  });

  return (
    data || {
      pending_scans: 0,
      pending_reviews: 0,
      approved_today: 0,
      rejected_today: 0,
    }
  );
}

// ===========================================
// CREATOR TYPES & INTERFACES
// ===========================================

// Creator application status
export type CreatorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

// Model approval status
export type ModelStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';

// Onboarding step
export type OnboardingStep =
  | 'account_type'
  | 'identity'
  | 'stripe_connect'
  | 'declarations'
  | 'submit';

// ===========================================
// CREATOR ENTITY
// ===========================================

export interface Creator {
  id: string;
  user_id: string;

  // Business info
  business_name?: string;
  business_type: 'individual' | 'company';
  country: string;

  // KYC & Verification
  kyc_status: 'not_started' | 'pending' | 'verified' | 'failed';
  id_verified: boolean;

  // Stripe Connect
  stripe_account_id?: string;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;

  // Platform status
  status: CreatorStatus;
  onboarding_step: OnboardingStep;
  onboarding_complete: boolean;

  // Profile
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;

  // Settings
  max_models: number;
  platform_fee_override?: number; // If null, use default

  // Timestamps
  created_at: string;
  updated_at: string;
  approved_at?: string;
  suspended_at?: string;
}

// ===========================================
// CREATOR DECLARATIONS
// ===========================================

export interface CreatorDeclaration {
  id: string;
  creator_id: string;

  // Declaration types
  declaration_type:
    | 'age_verification'      // I am 18+
    | 'content_ownership'     // I own/have rights to content
    | 'no_real_person'        // Not impersonating real person
    | 'terms_acceptance'      // Accept platform ToS
    | 'payout_terms'          // Accept payout terms
    | 'compliance_agreement'; // Agree to content guidelines

  // Record
  declared_at: string;
  ip_address?: string;
  user_agent?: string;

  // Declarations are immutable - no updated_at
}

// ===========================================
// AI MODEL / PERSONA
// ===========================================

export interface CreatorModel {
  id: string;
  creator_id: string;

  // Basic info
  name: string;
  age: number;

  // Profile
  avatar_url?: string;
  banner_url?: string;
  bio?: string;

  // Persona
  personality_traits: string[];
  interests: string[];
  backstory?: string;
  speaking_style?: string;

  // Visuals
  physical_traits?: {
    hair_color?: string;
    eye_color?: string;
    body_type?: string;
    height?: string;
    ethnicity?: string;
    distinctive_features?: string[];
  };

  // Chat settings
  turn_ons?: string[];
  turn_offs?: string[];
  emoji_usage: 'none' | 'minimal' | 'moderate' | 'heavy';
  response_length: 'short' | 'medium' | 'long';

  // Pricing
  subscription_price: number; // in cents/pence
  price_per_message?: number; // in tokens

  // Status
  status: ModelStatus;
  is_active: boolean;

  // Content flags
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  default_chat_mode: 'nsfw' | 'sfw';

  // Stats (denormalized for performance)
  subscriber_count: number;
  total_messages: number;
  total_earnings: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

// ===========================================
// TAGS
// ===========================================

export interface Tag {
  id: string;
  name: string;
  slug: string;
  category: 'primary' | 'secondary';
  description?: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface ModelTag {
  model_id: string;
  tag_id: string;
  is_primary: boolean;
  created_at: string;
}

// ===========================================
// CONTENT
// ===========================================

export type ContentVisibility = 'public' | 'subscribers' | 'ppv';
export type ContentType = 'image' | 'video' | 'audio';

export interface ContentItem {
  id: string;
  creator_id: string;
  model_id?: string;

  // Media
  type: ContentType;
  url: string;
  thumbnail_url?: string;

  // Metadata
  title?: string;
  description?: string;

  // Visibility
  visibility: ContentVisibility;
  is_nsfw: boolean;

  // Stats
  view_count: number;
  like_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ===========================================
// PPV (PAY-PER-VIEW)
// ===========================================

export interface PPVOffer {
  id: string;
  creator_id: string;
  model_id?: string;

  // Details
  title: string;
  description?: string;
  preview_url?: string;

  // Pricing
  price_tokens: number;

  // Content items included
  content_ids: string[];

  // Status
  is_active: boolean;

  // Stats
  purchase_count: number;
  total_revenue: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PPVEntitlement {
  id: string;
  user_id: string;
  ppv_offer_id: string;

  // Transaction
  amount_tokens: number;
  purchased_at: string;

  // Access
  expires_at?: string; // null = permanent
}

// ===========================================
// MODERATION
// ===========================================

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'impersonation'
  | 'underage_content'
  | 'non_consensual'
  | 'illegal_content'
  | 'other';

export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface ContentReport {
  id: string;
  reporter_id: string;

  // Target
  target_type: 'model' | 'content' | 'message' | 'creator';
  target_id: string;

  // Report details
  reason: ReportReason;
  description?: string;
  evidence_urls?: string[];

  // Status
  status: ReportStatus;

  // Resolution
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  action_taken?: string;

  // Timestamps
  created_at: string;
}

export type StrikeType = 'warning' | 'strike' | 'suspension' | 'ban';

export interface CreatorStrike {
  id: string;
  creator_id: string;

  // Details
  type: StrikeType;
  reason: string;

  // Related report if applicable
  report_id?: string;

  // Admin
  issued_by: string;

  // Appeal
  appealed: boolean;
  appeal_notes?: string;
  appeal_resolved_at?: string;
  appeal_outcome?: 'upheld' | 'overturned';

  // Timestamps
  issued_at: string;
  expires_at?: string; // For temporary strikes
}

// ===========================================
// ADMIN
// ===========================================

export interface AdminStats {
  // Queues
  pending_creators: number;
  pending_models: number;
  pending_reports: number;

  // Totals
  total_creators: number;
  total_models: number;
  total_subscribers: number;
  total_revenue: number;

  // Recent
  new_creators_today: number;
  new_subscribers_today: number;
  revenue_today: number;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;

  // Action
  action: string;
  target_type: string;
  target_id: string;

  // Details
  details: Record<string, unknown>;

  // Context
  ip_address?: string;
  user_agent?: string;

  // Timestamp
  created_at: string;
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface CreatorWithProfile extends Creator {
  profile?: {
    username: string;
    email: string;
  };
}

export interface ModelWithCreator extends CreatorModel {
  creator?: {
    display_name: string;
    avatar_url?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ===========================================
// FORM DATA TYPES
// ===========================================

export interface OnboardingFormData {
  // Step 1: Account Type
  business_type: 'individual' | 'company';
  business_name?: string;
  country: string;

  // Step 2: Identity
  display_name: string;
  bio?: string;
  date_of_birth?: string;

  // Step 3: Stripe - handled separately

  // Step 4: Declarations
  declarations: {
    age_verification: boolean;
    content_ownership: boolean;
    no_real_person: boolean;
    terms_acceptance: boolean;
    payout_terms: boolean;
    compliance_agreement: boolean;
  };
}

export interface ModelFormData {
  // Basic
  name: string;
  age: number;
  bio?: string;

  // Persona
  personality_traits: string[];
  interests: string[];
  backstory?: string;
  speaking_style?: string;

  // Visuals
  avatar_url?: string;
  banner_url?: string;
  physical_traits?: CreatorModel['physical_traits'];

  // Chat settings
  turn_ons?: string[];
  turn_offs?: string[];
  emoji_usage: CreatorModel['emoji_usage'];
  response_length: CreatorModel['response_length'];

  // Pricing
  subscription_price: number;
  price_per_message?: number;

  // Modes
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  default_chat_mode: 'nsfw' | 'sfw';

  // Tags
  primary_tag_id?: string;
  secondary_tag_ids?: string[];
}

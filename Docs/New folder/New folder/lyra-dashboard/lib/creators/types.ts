// ===========================================
// LYRA — CREATOR SYSTEM TYPES
// ===========================================

// ===========================================
// ENUMS
// ===========================================

export type CreatorStatus = 
  | 'INCOMPLETE' 
  | 'PENDING_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'SUSPENDED';

export type CreatorAccountType = 'INDIVIDUAL' | 'BUSINESS';

export type ModelStatus = 
  | 'DRAFT' 
  | 'PENDING_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'SUSPENDED';

export type ContentType = 'IMAGE' | 'VIDEO' | 'TEXT' | 'AUDIO';

export type ContentVisibility = 'PUBLIC_PREVIEW' | 'SUBSCRIBERS' | 'PPV';

export type PPVStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'DELETED';

export type EarningType = 
  | 'SUBSCRIPTION' 
  | 'TIP' 
  | 'PPV_SALE' 
  | 'MESSAGE_FEE' 
  | 'REFUND' 
  | 'CHARGEBACK' 
  | 'PAYOUT' 
  | 'ADJUSTMENT';

export type StrikeSeverity = 'WARNING' | 'STRIKE' | 'FINAL_WARNING' | 'BAN';

export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'SUPPORT';

// ===========================================
// CREATOR
// ===========================================

export interface Creator {
  id: string;
  user_id: string;
  
  // Account type
  account_type: CreatorAccountType;
  country_code?: string;
  
  // Legal identity
  legal_name?: string;
  business_name?: string;
  date_of_birth?: string;
  
  // Contact
  contact_email?: string;
  contact_phone?: string;
  
  // Address
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  
  // Stripe Connect
  stripe_connect_account_id?: string;
  stripe_connect_onboarding_complete: boolean;
  stripe_payouts_enabled: boolean;
  stripe_charges_enabled: boolean;
  stripe_requirements_due: string[];
  
  // Status
  status: CreatorStatus;
  onboarding_step: number;
  onboarding_completed_at?: string;
  
  // Limits
  max_models_allowed: number;
  trust_level: number;
  
  // Declarations
  declarations_accepted_at?: string;
  declarations_version?: string;
  
  // Admin
  admin_notes?: string;
  rejection_reason?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  approved_at?: string;
  suspended_at?: string;
}

export interface CreatorDeclaration {
  id: string;
  creator_id: string;
  declaration_type: string;
  declaration_text: string;
  accepted: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ===========================================
// MODEL (AI Persona)
// ===========================================

export interface CreatorModel {
  id: string;
  creator_id: string;
  
  // Basic info
  display_name: string;
  slug?: string;
  age: number;
  primary_language: string;
  
  // Profile
  bio?: string;
  tagline?: string;
  
  // Visuals
  avatar_url?: string;
  cover_url?: string;
  gallery_urls: string[];
  
  // Persona
  persona_traits: string[];
  interests: string[];
  style_preferences: Record<string, any>;
  personal_details: Record<string, any>;
  
  // Tags
  primary_tag_id?: string;
  primary_tag?: any; // Joined tag
  secondary_tags?: any[]; // Joined tags
  
  // Chat settings
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  
  // Monetization
  subscription_price_monthly?: number;
  subscription_currency: string;
  
  // Status
  status: ModelStatus;
  rejection_reason?: string;
  admin_notes?: string;
  
  // Metrics
  subscriber_count: number;
  total_earnings: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  suspended_at?: string;
}

// ===========================================
// CONTENT
// ===========================================

export interface ContentItem {
  id: string;
  creator_id: string;
  model_id: string;
  
  type: ContentType;
  storage_url: string;
  thumbnail_url?: string;
  
  filename?: string;
  file_size?: number;
  mime_type?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
  
  visibility: ContentVisibility;
  is_nsfw: boolean;
  content_flags: string[];
  
  is_deleted: boolean;
  deleted_at?: string;
  deleted_reason?: string;
  
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  creator_id: string;
  model_id: string;
  
  caption?: string;
  content_item_ids: string[];
  content_items?: ContentItem[]; // Joined
  
  visibility: ContentVisibility;
  
  is_ppv: boolean;
  ppv_id?: string;
  
  like_count: number;
  comment_count: number;
  
  is_pinned: boolean;
  is_deleted: boolean;
  
  created_at: string;
  updated_at: string;
  scheduled_at?: string;
  published_at?: string;
}

// ===========================================
// PPV
// ===========================================

export interface PPVOffer {
  id: string;
  creator_id: string;
  model_id: string;
  
  title: string;
  description?: string;
  preview_url?: string;
  
  content_item_ids: string[];
  content_items?: ContentItem[]; // Joined
  
  price_tokens: number;
  price_gbp_minor: number;
  
  subscribers_only: boolean;
  
  status: PPVStatus;
  
  purchase_count: number;
  total_revenue_tokens: number;
  
  created_at: string;
  updated_at: string;
  published_at?: string;
  expires_at?: string;
}

export interface PPVEntitlement {
  id: string;
  user_id: string;
  ppv_id: string;
  model_id: string;
  creator_id: string;
  
  price_tokens: number;
  price_gbp_minor: number;
  
  platform_fee_tokens: number;
  creator_share_tokens: number;
  
  purchased_at: string;
}

// ===========================================
// SUBSCRIPTIONS
// ===========================================

export interface ModelSubscription {
  id: string;
  user_id: string;
  model_id: string;
  creator_id: string;
  
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  
  status: 'active' | 'canceled' | 'past_due' | 'expired';
  
  price_monthly: number;
  currency: string;
  
  started_at: string;
  current_period_start?: string;
  current_period_end?: string;
  canceled_at?: string;
  ended_at?: string;
}

// ===========================================
// EARNINGS & PAYOUTS
// ===========================================

export interface CreatorEarning {
  id: string;
  creator_id: string;
  model_id?: string;
  
  type: EarningType;
  
  gross_amount_tokens: number;
  platform_fee_tokens: number;
  net_amount_tokens: number;
  
  gross_amount_gbp: number;
  platform_fee_gbp: number;
  net_amount_gbp: number;
  
  related_user_id?: string;
  related_subscription_id?: string;
  related_tip_id?: string;
  related_ppv_id?: string;
  related_payout_id?: string;
  
  status: 'pending' | 'available' | 'paid_out' | 'reversed';
  available_at?: string;
  
  created_at: string;
}

export interface CreatorPayout {
  id: string;
  creator_id: string;
  
  amount_tokens: number;
  amount_gbp_minor: number;
  
  stripe_transfer_id?: string;
  stripe_payout_id?: string;
  
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  period_start?: string;
  period_end?: string;
  
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  
  error_message?: string;
}

// ===========================================
// MODERATION
// ===========================================

export interface CreatorStrike {
  id: string;
  creator_id: string;
  model_id?: string;
  
  severity: StrikeSeverity;
  reason: string;
  evidence_urls: string[];
  
  issued_by: string;
  
  is_active: boolean;
  appealed: boolean;
  appeal_text?: string;
  appeal_resolved_at?: string;
  appeal_outcome?: string;
  
  created_at: string;
  expires_at?: string;
  removed_at?: string;
  removed_by?: string;
  removed_reason?: string;
}

export interface ContentReport {
  id: string;
  reporter_user_id: string;
  
  reported_creator_id?: string;
  reported_model_id?: string;
  reported_content_id?: string;
  reported_post_id?: string;
  
  reason: string;
  description?: string;
  
  status: ReportStatus;
  
  resolved_by?: string;
  resolution_notes?: string;
  action_taken?: string;
  
  created_at: string;
  resolved_at?: string;
}

// ===========================================
// AUDIT
// ===========================================

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_type: 'ADMIN' | 'CREATOR' | 'USER' | 'SYSTEM';
  action: string;
  
  target_creator_id?: string;
  target_model_id?: string;
  target_content_id?: string;
  target_user_id?: string;
  
  old_value?: any;
  new_value?: any;
  notes?: string;
  
  ip_address?: string;
  user_agent?: string;
  
  created_at: string;
}

// ===========================================
// ONBOARDING
// ===========================================

export interface OnboardingStep1Data {
  account_type: CreatorAccountType;
  country_code: string;
}

export interface OnboardingStep2Data {
  legal_name?: string;
  business_name?: string;
  date_of_birth?: string;
  contact_email: string;
  contact_phone?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
}

export interface OnboardingStep3Data {
  stripe_connect_started: boolean;
}

export interface OnboardingStep4Data {
  declarations: {
    is_18_plus: boolean;
    personas_fictional: boolean;
    no_real_person_likeness: boolean;
    no_minors: boolean;
    no_celebrity_impersonation: boolean;
    owns_content_rights: boolean;
    agrees_to_terms: boolean;
  };
}

export const DECLARATION_TEXTS = {
  is_18_plus: 'I confirm that I am 18 years of age or older.',
  personas_fictional: 'All AI personas I publish are fictional, or I have documented rights to depict them.',
  no_real_person_likeness: 'I will not create personas that resemble real persons without documented consent.',
  no_minors: 'I will not create personas depicting minors or youth-coded themes.',
  no_celebrity_impersonation: 'I will not impersonate celebrities or public figures.',
  owns_content_rights: 'I own or have rights to all content I upload to this platform.',
  agrees_to_terms: 'I agree that the platform may remove content and suspend accounts for violations of these terms.',
};

// ===========================================
// MODEL CREATION
// ===========================================

export interface ModelStep1Data {
  display_name: string;
  age: number;
  primary_language: string;
  primary_tag_id?: string;
  secondary_tag_ids?: string[];
}

export interface ModelStep2Data {
  avatar_url?: string;
  cover_url?: string;
  gallery_urls?: string[];
}

export interface ModelStep3Data {
  bio?: string;
  tagline?: string;
  persona_traits?: string[];
  interests?: string[];
  style_preferences?: Record<string, any>;
  personal_details?: Record<string, any>;
}

export interface ModelStep4Data {
  subscription_price_monthly?: number;
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
}

// ===========================================
// API TYPES
// ===========================================

export interface CreatorDashboardStats {
  total_subscribers: number;
  total_earnings_gbp: number;
  available_balance_gbp: number;
  pending_balance_gbp: number;
  total_models: number;
  total_posts: number;
  total_ppv_sales: number;
  monthly_earnings: { month: string; amount: number }[];
}

export interface AdminQueueItem {
  id: string;
  type: 'creator' | 'model' | 'report';
  created_at: string;
  data: Creator | CreatorModel | ContentReport;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

export function formatGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function getStatusColor(status: CreatorStatus | ModelStatus): string {
  switch (status) {
    case 'APPROVED':
      return 'text-green-400 bg-green-500/20';
    case 'PENDING_REVIEW':
      return 'text-yellow-400 bg-yellow-500/20';
    case 'REJECTED':
      return 'text-red-400 bg-red-500/20';
    case 'SUSPENDED':
      return 'text-red-400 bg-red-500/20';
    case 'DRAFT':
    case 'INCOMPLETE':
    default:
      return 'text-gray-400 bg-gray-500/20';
  }
}

export function getStatusLabel(status: CreatorStatus | ModelStatus): string {
  switch (status) {
    case 'INCOMPLETE':
      return 'Incomplete';
    case 'PENDING_REVIEW':
      return 'Pending Review';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Rejected';
    case 'SUSPENDED':
      return 'Suspended';
    case 'DRAFT':
      return 'Draft';
    default:
      return status;
  }
}

export function canPublishModel(creator: Creator): boolean {
  return creator.status === 'APPROVED' && creator.stripe_payouts_enabled;
}

export function canCreateMoreModels(creator: Creator, currentModelCount: number): boolean {
  return currentModelCount < creator.max_models_allowed;
}

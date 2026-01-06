// ===========================================
// LYRA — TAG SYSTEM TYPES & UTILITIES
// ===========================================

export type TagType = 'PRIMARY' | 'SECONDARY';

export type BlockedTermSeverity = 'BLOCK' | 'WARN' | 'FLAG';

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: TagType;
  emoji?: string;
  color?: string;
  icon?: string;
  sort_order: number;
  nsfw_allowed: boolean;
  nsfw_only: boolean;
  active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ModelTag {
  id: string;
  model_id: string;
  tag_id: string;
  is_primary: boolean;
  added_at: string;
  added_by?: string;
  tag?: Tag;
}

export interface BlockedTerm {
  id: string;
  term: string;
  reason?: string;
  severity: BlockedTermSeverity;
  created_at: string;
}

export interface TagAuditLog {
  id: string;
  tag_id?: string;
  model_id?: string;
  action: string;
  actor_id: string;
  actor_type: 'ADMIN' | 'CREATOR' | 'SYSTEM';
  old_value?: any;
  new_value?: any;
  reason?: string;
  created_at: string;
}

export interface TagValidationResult {
  valid: boolean;
  error_message?: string;
  blocked_terms?: { term: string; reason: string; severity: string }[];
}

export interface TagSelection {
  primary_tag_id: string;
  secondary_tag_ids: string[];
}

// ===========================================
// CONSTANTS
// ===========================================

export const MAX_SECONDARY_TAGS = 8;

export const TAG_CONFIG = {
  maxSecondaryTags: 8,
  maxTagNameLength: 50,
  maxDescriptionLength: 255,
};

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Generate URL-safe slug from tag name
 */
export function generateTagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format tag for display with emoji
 */
export function formatTagDisplay(tag: Tag): string {
  return tag.emoji ? `${tag.emoji} ${tag.name}` : tag.name;
}

/**
 * Group tags by type
 */
export function groupTagsByType(tags: Tag[]): {
  primary: Tag[];
  secondary: Tag[];
} {
  return {
    primary: tags.filter((t) => t.type === 'PRIMARY'),
    secondary: tags.filter((t) => t.type === 'SECONDARY'),
  };
}

/**
 * Filter tags based on NSFW mode
 */
export function filterTagsForMode(tags: Tag[], isNsfw: boolean): Tag[] {
  return tags.filter((tag) => {
    if (tag.nsfw_only && !isNsfw) return false;
    return true;
  });
}

/**
 * Check if tag selection is valid
 */
export function validateTagSelectionClient(
  primaryTagId: string | null,
  secondaryTagIds: string[],
  availableTags: Tag[],
  isNsfw: boolean
): TagValidationResult {
  // Must have primary tag
  if (!primaryTagId) {
    return { valid: false, error_message: 'Primary category is required' };
  }

  // Check primary tag exists and is PRIMARY type
  const primaryTag = availableTags.find((t) => t.id === primaryTagId);
  if (!primaryTag) {
    return { valid: false, error_message: 'Invalid primary category' };
  }
  if (primaryTag.type !== 'PRIMARY') {
    return { valid: false, error_message: 'Selected tag is not a primary category' };
  }
  if (primaryTag.nsfw_only && !isNsfw) {
    return { valid: false, error_message: 'This category requires NSFW mode' };
  }

  // Check secondary tag count
  if (secondaryTagIds.length > MAX_SECONDARY_TAGS) {
    return {
      valid: false,
      error_message: `Maximum ${MAX_SECONDARY_TAGS} secondary tags allowed`,
    };
  }

  // Check secondary tags
  for (const tagId of secondaryTagIds) {
    const tag = availableTags.find((t) => t.id === tagId);
    if (!tag) {
      return { valid: false, error_message: 'Invalid secondary tag selected' };
    }
    if (tag.nsfw_only && !isNsfw) {
      return {
        valid: false,
        error_message: `Tag "${tag.name}" requires NSFW mode`,
      };
    }
  }

  return { valid: true };
}

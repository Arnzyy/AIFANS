// Admin access helper for testing accounts
// Add emails here that should have full access to all content

const ADMIN_EMAILS: string[] = [
  'admin@joinlyra.com',
];

/**
 * Check if a user email is an admin with full access
 * Admin users can:
 * - Access all chat features without subscription
 * - View all locked/PPV content
 * - Bypass subscription requirements
 */
export function isAdminUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Check if user has admin access (for use with Supabase user object)
 */
export function hasAdminAccess(user: { email?: string | null } | null): boolean {
  return isAdminUser(user?.email);
}

// ===========================================
// SAFE DATABASE QUERY UTILITIES
// Prevents 500 errors from unhandled .single() failures
// ===========================================

import { PostgrestSingleResponse } from '@supabase/supabase-js';

// ===========================================
// TYPES
// ===========================================

export interface SafeSingleResult<T> {
  data: T | null;
  error: string | null;
  notFound: boolean;
  multipleFound: boolean;
}

export interface SafeSingleOptions {
  /** Context for logging (e.g., "user profile", "subscription check") */
  context?: string;
  /** If true, throw an error instead of returning null when not found */
  throwOnNotFound?: boolean;
  /** If true, log warnings for debugging */
  debug?: boolean;
}

// ===========================================
// SAFE SINGLE QUERY
// ===========================================

/**
 * Safely handle .single() query results without throwing 500 errors.
 *
 * Use this wrapper around Supabase queries that use .single() to:
 * - Handle "no rows returned" gracefully (returns null, not 500)
 * - Handle "multiple rows returned" (data integrity issue - logs error)
 * - Provide clear error context for debugging
 *
 * @example
 * // Before (can throw 500 on no rows):
 * const { data } = await supabase.from('users').select().eq('id', id).single();
 *
 * // After (graceful handling):
 * const result = await safeSingle(
 *   supabase.from('users').select().eq('id', id).single(),
 *   { context: 'user lookup' }
 * );
 * if (result.notFound) return { error: 'User not found' };
 * const user = result.data;
 */
export async function safeSingle<T>(
  query: PromiseLike<PostgrestSingleResponse<T>>,
  options: SafeSingleOptions = {}
): Promise<SafeSingleResult<T>> {
  const { context = 'query', throwOnNotFound = false, debug = false } = options;

  try {
    const { data, error } = await query;

    // No error = success
    if (!error) {
      return {
        data,
        error: null,
        notFound: false,
        multipleFound: false,
      };
    }

    // Handle specific PostgreSQL/Supabase errors
    const errorMessage = error.message || '';
    const errorCode = error.code || '';

    // PGRST116: "JSON object requested, multiple (or no) rows returned"
    // This is the common .single() failure
    if (errorCode === 'PGRST116' || errorMessage.includes('multiple') || errorMessage.includes('no rows')) {
      // Check if it's "no rows" vs "multiple rows"
      if (errorMessage.toLowerCase().includes('0 rows') || errorMessage.includes('no rows')) {
        if (debug) {
          console.log(`[SafeSingle] No rows found for ${context}`);
        }

        if (throwOnNotFound) {
          throw new Error(`${context}: not found`);
        }

        return {
          data: null,
          error: null,
          notFound: true,
          multipleFound: false,
        };
      }

      // Multiple rows = data integrity issue
      console.error(`[SafeSingle] MULTIPLE ROWS for ${context} - data integrity issue!`);
      return {
        data: null,
        error: `Multiple records found for ${context}`,
        notFound: false,
        multipleFound: true,
      };
    }

    // Other errors (network, permissions, etc.)
    console.error(`[SafeSingle] Error in ${context}:`, error);
    return {
      data: null,
      error: errorMessage || 'Database query failed',
      notFound: false,
      multipleFound: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[SafeSingle] Exception in ${context}:`, message);
    return {
      data: null,
      error: message,
      notFound: false,
      multipleFound: false,
    };
  }
}

// ===========================================
// SAFE MAYBE SINGLE (for optional lookups)
// ===========================================

/**
 * For queries where "not found" is expected and valid.
 * Uses .maybeSingle() internally for better semantics.
 *
 * @example
 * const user = await safeMaybeSingle(
 *   supabase.from('users').select().eq('email', email).maybeSingle()
 * );
 * // user is null if not found, no error
 */
export async function safeMaybeSingle<T>(
  query: PromiseLike<PostgrestSingleResponse<T>>,
  options: SafeSingleOptions = {}
): Promise<T | null> {
  const result = await safeSingle(query, { ...options, throwOnNotFound: false });
  return result.data;
}

// ===========================================
// REQUIRE SINGLE (for critical lookups)
// ===========================================

/**
 * For queries where "not found" is an error condition.
 * Throws a clear error if not found.
 *
 * @example
 * try {
 *   const subscription = await requireSingle(
 *     supabase.from('subscriptions').select().eq('id', subId).single(),
 *     { context: 'subscription for payment' }
 *   );
 * } catch (err) {
 *   return { error: 'Subscription not found' };
 * }
 */
export async function requireSingle<T>(
  query: PromiseLike<PostgrestSingleResponse<T>>,
  options: SafeSingleOptions = {}
): Promise<T> {
  const result = await safeSingle(query, { ...options, throwOnNotFound: true });

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.data === null) {
    throw new Error(`${options.context || 'Record'} not found`);
  }

  return result.data;
}

// ===========================================
// BATCH SAFE QUERIES
// ===========================================

/**
 * Run multiple single queries in parallel with safe handling.
 *
 * @example
 * const [user, subscription, session] = await safeSingleBatch([
 *   { query: supabase.from('users').select().eq('id', userId).single(), context: 'user' },
 *   { query: supabase.from('subscriptions').select().eq('user_id', userId).single(), context: 'subscription' },
 *   { query: supabase.from('sessions').select().eq('user_id', userId).single(), context: 'session' },
 * ]);
 */
export async function safeSingleBatch<T>(
  queries: Array<{
    query: PromiseLike<PostgrestSingleResponse<T>>;
    context?: string;
  }>
): Promise<SafeSingleResult<T>[]> {
  return Promise.all(
    queries.map(({ query, context }) => safeSingle(query, { context }))
  );
}

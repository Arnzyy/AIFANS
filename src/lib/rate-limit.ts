import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client (only if credentials are provided)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Auth endpoints: 5 requests per 15 minutes per IP
// Prevents brute force attacks on login/signup
export const authRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'ratelimit:auth',
      analytics: true,
    })
  : null;

// Chat endpoints: 30 messages per hour per user
// Prevents API abuse and excessive LLM costs
export const chatRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 h'),
      prefix: 'ratelimit:chat',
      analytics: true,
    })
  : null;

// Upload endpoints: 10 uploads per hour per user
// Prevents storage exhaustion and abuse
export const uploadRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      prefix: 'ratelimit:upload',
      analytics: true,
    })
  : null;

// Admin endpoints: 100 requests per minute
// More generous for admin users
export const adminRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      prefix: 'ratelimit:admin',
      analytics: true,
    })
  : null;

// API general: 60 requests per minute per user
// Default rate limit for other API endpoints
export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'ratelimit:api',
      analytics: true,
    })
  : null;

/**
 * Helper function to check rate limit and return appropriate response
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param rateLimit - Rate limiter instance to use
 * @returns Object with success boolean and remaining count
 */
export async function checkRateLimit(
  identifier: string,
  rateLimit: Ratelimit | null
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  // If rate limiting not configured (dev mode), allow all requests
  if (!rateLimit) {
    return { success: true };
  }

  const result = await rateLimit.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Get client IP address from request headers
 * @param request - Next.js request object
 * @returns IP address string
 */
export function getClientIp(request: Request): string {
  // Check various headers for IP address (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (cfConnectingIp) return cfConnectingIp;
  if (realIp) return realIp;
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return 'unknown';
}

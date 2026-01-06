import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Countries blocked due to regulations
// UK removed - no nudity in Phase 1, so OSA not applicable
const BLOCKED_COUNTRIES: string[] = [
  // Add countries here if needed in the future
];

// Bypass token for demos
const BYPASS_TOKEN = 'investor2025';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for session refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser();

  // Check for bypass token in URL
  const bypassParam = request.nextUrl.searchParams.get('access');
  if (bypassParam === BYPASS_TOKEN) {
    response.cookies.set('demo_access', 'granted', {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: true,
    });
    return response;
  }

  // Check for existing bypass cookie
  if (request.cookies.get('demo_access')?.value === 'granted') {
    return response;
  }

  // Get country from Vercel's geo headers
  const country = request.geo?.country || '';

  // Block restricted countries
  if (BLOCKED_COUNTRIES.includes(country)) {
    return NextResponse.rewrite(new URL('/blocked', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|blocked).*)',
  ],
};

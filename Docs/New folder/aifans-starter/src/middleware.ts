import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Countries to block (e.g., UK for Online Safety Act compliance)
const BLOCKED_COUNTRIES = process.env.BLOCKED_COUNTRIES?.split(',') || ['GB', 'UK'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // ===========================================
  // GEO-BLOCKING
  // ===========================================
  const country = request.geo?.country || request.headers.get('cf-ipcountry');
  
  if (country && BLOCKED_COUNTRIES.includes(country.toUpperCase())) {
    // Return a blocked page or redirect
    return NextResponse.rewrite(new URL('/blocked', request.url));
  }

  // ===========================================
  // SUPABASE AUTH
  // ===========================================
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  // ===========================================
  // PROTECTED ROUTES
  // ===========================================
  const pathname = request.nextUrl.pathname;

  // Auth pages - redirect to feed if already logged in
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (user) {
      return NextResponse.redirect(new URL('/feed', request.url));
    }
  }

  // Protected pages - redirect to login if not authenticated
  const protectedPaths = ['/feed', '/messages', '/dashboard', '/settings'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Creator-only pages
  const creatorPaths = ['/dashboard', '/posts/new', '/subscribers', '/analytics', '/ai-chat-setup'];
  const isCreatorPath = creatorPaths.some(path => pathname.startsWith(path));
  
  if (isCreatorPath && user) {
    // Check if user is a creator (this would need a DB call in production)
    // For now, we'll handle this in the page components
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};

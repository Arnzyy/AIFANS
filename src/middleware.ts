import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Countries blocked due to regulations
const BLOCKED_COUNTRIES = [
  'GB', // United Kingdom
];

// Bypass token for demos
const BYPASS_TOKEN = 'investor2025';

export function middleware(request: NextRequest) {
  // Check for bypass token in URL
  const bypassParam = request.nextUrl.searchParams.get('access');
  if (bypassParam === BYPASS_TOKEN) {
    const response = NextResponse.next();
    response.cookies.set('demo_access', 'granted', {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: true,
    });
    return response;
  }

  // Check for existing bypass cookie
  if (request.cookies.get('demo_access')?.value === 'granted') {
    return NextResponse.next();
  }

  // Get country from Vercel's geo headers
  const country = request.geo?.country || '';

  // Block restricted countries
  if (BLOCKED_COUNTRIES.includes(country)) {
    return NextResponse.rewrite(new URL('/blocked', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|blocked).*)',
  ],
};

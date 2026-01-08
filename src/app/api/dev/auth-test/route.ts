import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Check cookies from request
    const cookieHeader = request.headers.get('cookie');
    const cookieNames = cookieHeader?.split(';').map(c => c.trim().split('=')[0]) || [];

    // Check cookies from next/headers
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const headerCookieNames = allCookies.map(c => c.name);

    // Try to get user
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    return NextResponse.json({
      requestCookies: {
        present: !!cookieHeader,
        names: cookieNames,
      },
      nextHeadersCookies: {
        count: allCookies.length,
        names: headerCookieNames,
      },
      auth: {
        hasUser: !!user,
        userId: user?.id,
        error: error?.message,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

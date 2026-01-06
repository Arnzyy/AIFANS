// API Route: /api/admin/reports
// Get content reports

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    let query = supabase
      .from('content_reports')
      .select(`
        *,
        creator_models (
          id,
          display_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data: reports, error } = await query.limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      reports: reports?.map(r => ({
        ...r,
        model: r.creator_models,
      })) || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

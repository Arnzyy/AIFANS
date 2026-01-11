// API Route: /api/admin/moderation/[scanId]/review
// Review a moderation scan (approve/reject)

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { reviewScan } from '@/lib/moderation';

export async function POST(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
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

    const { action, notes, addAsAnchor } = await request.json();

    if (!['approved', 'rejected', 'escalated'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await reviewScan(
      params.scanId,
      user.id,
      action,
      notes,
      addAsAnchor
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API Route: /api/admin/reports/[reportId]/resolve
// Resolve a content report

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { reportId: string } }
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

    const { action, notes } = await request.json();

    // Update report
    const { error: updateError } = await supabase
      .from('content_reports')
      .update({
        status: 'RESOLVED',
        action_taken: action,
        resolution_notes: notes,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', params.reportId);

    if (updateError) {
      throw updateError;
    }

    // Log action
    await supabase.from('audit_log').insert({
      action: 'REPORT_RESOLVED',
      entity_type: 'CONTENT_REPORT',
      entity_id: params.reportId,
      actor_id: user.id,
      details: { action, notes },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

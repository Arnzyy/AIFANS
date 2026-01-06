// ===========================================
// API ROUTE: /api/admin/creators/[creatorId]/approve
// Approve a creator
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { AdminService } from '@/lib/creators/creator-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminService = new AdminService(supabase);
    const isAdmin = await adminService.isAdmin(user.id);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    await adminService.approveCreator(params.creatorId, user.id, body.notes);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

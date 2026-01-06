// ===========================================
// API ROUTE: /api/admin/models/[modelId]/reject
// Reject a model
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { AdminService } from '@/lib/creators/creator-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { modelId: string } }
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

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
    }

    await adminService.rejectModel(params.modelId, user.id, reason);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

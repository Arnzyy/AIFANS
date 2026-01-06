// ===========================================
// API ROUTES: /api/admin/creators
// Admin creator management endpoints
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { AdminService } from '@/lib/creators/creator-service';

// GET /api/admin/creators/pending - Get pending creator approvals
export async function GET(request: NextRequest) {
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

    const creators = await adminService.getPendingCreators();
    return NextResponse.json({ creators });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ===========================================
// API ROUTE: /api/admin/stats
// Admin dashboard statistics
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { AdminService } from '@/lib/creators/creator-service';

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

    // Get counts
    const { count: pendingCreators } = await supabase
      .from('creators')
      .select('id', { count: 'exact' })
      .eq('status', 'PENDING_REVIEW');

    const { count: pendingModels } = await supabase
      .from('creator_models')
      .select('id', { count: 'exact' })
      .eq('status', 'PENDING_REVIEW');

    const { count: pendingReports } = await supabase
      .from('content_reports')
      .select('id', { count: 'exact' })
      .eq('status', 'PENDING');

    const { count: activeStrikes } = await supabase
      .from('creator_strikes')
      .select('id', { count: 'exact' })
      .eq('is_active', true);

    return NextResponse.json({
      pendingCreators: pendingCreators || 0,
      pendingModels: pendingModels || 0,
      pendingReports: pendingReports || 0,
      activeStrikes: activeStrikes || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

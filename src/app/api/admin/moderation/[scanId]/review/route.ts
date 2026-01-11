// API Route: /api/admin/moderation/[scanId]/review
// Review a moderation scan (approve/reject)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminService } from '@/lib/creators';
import { reviewScan } from '@/lib/moderation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params;
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const adminService = createAdminService(supabase);
    const isAdmin = await adminService.isAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, notes, addAsAnchor } = await request.json();

    if (!['approved', 'rejected', 'escalated'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await reviewScan(scanId, user.id, action, notes, addAsAnchor);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { createServerClient } from '@/lib/supabase/server';
import { createAdminService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/creators/[id]/reject - Reject a creator application
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const adminService = createAdminService(supabase);

    // Check admin access
    const isAdmin = await adminService.isAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse body for reason (required)
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Reject the creator
    const creator = await adminService.rejectCreator(params.id, user.id, reason);

    return NextResponse.json({
      success: true,
      creator,
      message: 'Creator rejected',
    });
  } catch (error) {
    console.error('Error rejecting creator:', error);
    return NextResponse.json(
      { error: 'Failed to reject creator' },
      { status: 500 }
    );
  }
}

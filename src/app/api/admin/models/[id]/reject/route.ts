import { createServerClient } from '@/lib/supabase/server';
import { createAdminService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/models/[id]/reject - Reject a model
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

    // Reject the model
    const model = await adminService.rejectModel(params.id, user.id, reason);

    return NextResponse.json({
      success: true,
      model,
      message: 'Model rejected',
    });
  } catch (error) {
    console.error('Error rejecting model:', error);
    return NextResponse.json(
      { error: 'Failed to reject model' },
      { status: 500 }
    );
  }
}

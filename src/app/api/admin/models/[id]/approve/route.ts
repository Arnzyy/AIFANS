import { createServerClient } from '@/lib/supabase/server';
import { createAdminService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/models/[id]/approve - Approve a model
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

    // Parse body for optional notes
    let notes: string | undefined;
    try {
      const body = await request.json();
      notes = body.notes;
    } catch {
      // No body provided, that's fine
    }

    // Approve the model
    const model = await adminService.approveModel(params.id, user.id, notes);

    return NextResponse.json({
      success: true,
      model,
      message: 'Model approved successfully',
    });
  } catch (error) {
    console.error('Error approving model:', error);
    return NextResponse.json(
      { error: 'Failed to approve model' },
      { status: 500 }
    );
  }
}

import { createServerClient } from '@/lib/supabase/server';
import { createAdminService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/creators/[id]/approve - Approve a creator application
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

    // Approve the creator
    const creator = await adminService.approveCreator(params.id, user.id, notes);

    // Update profile to mark as creator
    await supabase
      .from('profiles')
      .update({ is_creator: true })
      .eq('id', creator.user_id);

    return NextResponse.json({
      success: true,
      creator,
      message: 'Creator approved successfully',
    });
  } catch (error) {
    console.error('Error approving creator:', error);
    return NextResponse.json(
      { error: 'Failed to approve creator' },
      { status: 500 }
    );
  }
}

import { createServerClient } from '@/lib/supabase/server';
import { createAdminService } from '@/lib/creators';
import { NextResponse } from 'next/server';

// GET /api/admin/check-access - Check if current user has admin access
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { isAdmin: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const adminService = createAdminService(supabase);
    const isAdmin = await adminService.isAdmin(user.id);

    return NextResponse.json({
      isAdmin,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error checking admin access:', error);
    return NextResponse.json(
      { isAdmin: false, error: 'Failed to check admin access' },
      { status: 500 }
    );
  }
}

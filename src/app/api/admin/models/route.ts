import { createServerClient } from '@/lib/supabase/server';
import { createAdminService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/models - Get models for review
export async function GET(request: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const status = searchParams.get('status') || 'pending_review';

    // Get models based on status
    let query = supabase
      .from('creator_models')
      .select(`
        *,
        creator:creators!creator_id(display_name, avatar_url, user_id)
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: status === 'pending_review' })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

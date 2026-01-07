import { createServerClient } from '@/lib/supabase/server';
import { createAdminService, createCreatorService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/creators/[id] - Get single creator details
export async function GET(
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

    const creatorService = createCreatorService(supabase);
    const creator = await creatorService.getCreatorById(params.id);

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Get declarations
    const declarations = await creatorService.getDeclarations(params.id);

    // Get models
    const models = await creatorService.getModels(params.id);

    // Get profile info
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, email, display_name, avatar_url')
      .eq('id', creator.user_id)
      .single();

    return NextResponse.json({
      creator,
      profile,
      declarations,
      models,
    });
  } catch (error) {
    console.error('Error fetching creator:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator' },
      { status: 500 }
    );
  }
}

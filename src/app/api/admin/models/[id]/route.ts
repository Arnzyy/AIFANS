import { createServerClient } from '@/lib/supabase/server';
import { createAdminService, createCreatorService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/models/[id] - Get single model details
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
    const model = await creatorService.getModelById(params.id);

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Get creator info
    const creator = await creatorService.getCreatorById(model.creator_id);

    // Get model tags
    const tags = await creatorService.getModelTags(params.id);

    // Get tag details
    const { data: tagDetails } = await supabase
      .from('tags')
      .select('*')
      .in('id', tags.map(t => t.tag_id));

    // Get content samples (first 10 items)
    const { data: contentSamples } = await supabase
      .from('content_items')
      .select('id, type, url, thumbnail_url, visibility, is_nsfw')
      .eq('model_id', params.id)
      .limit(10);

    return NextResponse.json({
      model,
      creator,
      tags: tags.map(t => ({
        ...t,
        tag: tagDetails?.find(td => td.id === t.tag_id),
      })),
      content_samples: contentSamples || [],
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    );
  }
}

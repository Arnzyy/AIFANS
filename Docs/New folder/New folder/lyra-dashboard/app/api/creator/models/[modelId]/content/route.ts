// ===========================================
// API ROUTE: /api/creator/models/[modelId]/content
// Model content management
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CreatorService } from '@/lib/creators/creator-service';

// GET - Get content for model
export async function GET(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visibility = searchParams.get('visibility') as any;

    const creatorService = new CreatorService(supabase);
    const content = await creatorService.getModelContent(params.modelId, visibility);

    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create content item
export async function POST(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const body = await request.json();
    
    const creatorService = new CreatorService(supabase);
    const content = await creatorService.createContentItem(creator.id, params.modelId, body);

    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

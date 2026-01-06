// ===========================================
// API ROUTE: /api/creator/models/[modelId]/ppv
// PPV management for model
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CreatorService } from '@/lib/creators/creator-service';

// GET - Get PPV offers for model
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

    const creatorService = new CreatorService(supabase);
    const offers = await creatorService.getModelPPVOffers(params.modelId);

    return NextResponse.json({ offers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create PPV offer
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
    const offer = await creatorService.createPPVOffer(creator.id, params.modelId, body);

    return NextResponse.json({ offer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

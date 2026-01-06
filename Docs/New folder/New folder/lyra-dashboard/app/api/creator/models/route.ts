// ===========================================
// API ROUTE: /api/creator/models
// Model CRUD operations
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CreatorService } from '@/lib/creators/creator-service';

// GET - Get all models for current creator
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorService = new CreatorService(supabase);
    const creator = await creatorService.getCreatorByUserId(user.id);
    
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const models = await creatorService.getCreatorModels(creator.id);

    return NextResponse.json({ models });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new model
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const creatorService = new CreatorService(supabase);
    
    const model = await creatorService.createModel(user.id, body);

    return NextResponse.json({ model });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

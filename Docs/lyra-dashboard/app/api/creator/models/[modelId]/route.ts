// ===========================================
// API ROUTE: /api/creator/models/[modelId]
// Single model CRUD operations
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CreatorService } from '@/lib/creators/creator-service';

// GET - Get single model
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
    const model = await creatorService.getModelById(params.modelId);

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    return NextResponse.json({ model });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update model
export async function PUT(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { step, data } = body;

    const creatorService = new CreatorService(supabase);
    let model;

    switch (step) {
      case 2:
        model = await creatorService.updateModelVisuals(params.modelId, data);
        break;
      case 3:
        model = await creatorService.updateModelPersona(params.modelId, data);
        break;
      case 4:
        model = await creatorService.updateModelMonetization(params.modelId, data);
        break;
      default:
        // General update
        const { data: updated, error } = await supabase
          .from('creator_models')
          .update(data)
          .eq('id', params.modelId)
          .select()
          .single();
        
        if (error) throw error;
        model = updated;
    }

    return NextResponse.json({ model });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete model
export async function DELETE(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow deleting DRAFT models
    const { data: model } = await supabase
      .from('creator_models')
      .select('status')
      .eq('id', params.modelId)
      .single();

    if (model?.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft models can be deleted' },
        { status: 400 }
      );
    }

    await supabase
      .from('creator_models')
      .delete()
      .eq('id', params.modelId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

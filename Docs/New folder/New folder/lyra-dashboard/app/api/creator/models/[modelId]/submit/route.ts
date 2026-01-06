// ===========================================
// API ROUTE: /api/creator/models/[modelId]/submit
// Submit model for review
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CreatorService } from '@/lib/creators/creator-service';

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

    const creatorService = new CreatorService(supabase);
    const result = await creatorService.submitModelForReview(params.modelId, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Get updated model
    const model = await creatorService.getModelById(params.modelId);

    return NextResponse.json({ success: true, model });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

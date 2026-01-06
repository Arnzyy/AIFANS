// ===========================================
// API ROUTE: /api/ppv/[ppvId]/purchase
// Purchase PPV content
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CreatorService } from '@/lib/creators/creator-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { ppvId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorService = new CreatorService(supabase);
    const result = await creatorService.purchasePPV(user.id, params.ppvId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      entitlement: result.entitlement,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

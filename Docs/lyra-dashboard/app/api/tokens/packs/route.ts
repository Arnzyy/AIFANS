// ===========================================
// TOKEN PACKS API
// /api/tokens/packs/route.ts
// Get available token packs
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getTokenPacks } from '@/lib/tokens/token-service';

// GET - Get all active token packs
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const packs = await getTokenPacks(supabase);

    return NextResponse.json({ packs });

  } catch (error) {
    console.error('Get token packs error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

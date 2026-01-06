// ===========================================
// TOKEN PACKS API
// Get available token packs for purchase
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getTokenPacks } from '@/lib/tokens/token-service';

// GET - Get all active token packs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const packs = await getTokenPacks(supabase);

    return NextResponse.json({ packs });
  } catch (error) {
    console.error('Get token packs error:', error);
    return NextResponse.json({ error: 'Failed to fetch packs' }, { status: 500 });
  }
}

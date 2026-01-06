// ===========================================
// API ROUTE: /api/tags
// Get available tags for model creation
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'primary' | 'secondary' | null for all
    const includeNsfw = searchParams.get('nsfw') === 'true';

    let query = supabase
      .from('tags')
      .select('*')
      .eq('active', true);

    // Filter by type
    if (type === 'primary') {
      query = query.eq('type', 'PRIMARY');
    } else if (type === 'secondary') {
      query = query.eq('type', 'SECONDARY');
    }

    // Filter NSFW
    if (!includeNsfw) {
      query = query.eq('nsfw_only', false);
    }

    // Order by type and sort_order
    query = query.order('type').order('sort_order');

    const { data: tags, error } = await query;

    if (error) {
      console.error('Tags fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tags: tags || [] });

  } catch (error: any) {
    console.error('Tags API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

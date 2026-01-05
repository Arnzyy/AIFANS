import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/creators - List creators
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get('q');
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '24');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('profiles')
    .select(`
      *,
      creator_profiles!inner(*)
    `)
    .eq('role', 'creator')
    .range(offset, offset + limit - 1);

  // Search filter
  if (search) {
    query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%`);
  }

  // Category filters
  if (category === 'new') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    query = query.gte('created_at', weekAgo.toISOString());
  } else if (category === 'popular') {
    query = query.order('creator_profiles(subscriber_count)', { ascending: false });
  } else if (category === 'ai-chat') {
    query = query.eq('creator_profiles.ai_chat_enabled', true);
  } else if (category === 'free') {
    query = query.or('creator_profiles.subscription_price.is.null,creator_profiles.subscription_price.eq.0');
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: creators, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ creators });
}

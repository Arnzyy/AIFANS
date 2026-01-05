import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/creators/[username] - Get creator profile
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: creator, error } = await supabase
    .from('profiles')
    .select(`
      *,
      creator_profiles(*),
      subscription_tiers(*)
    `)
    .eq('username', params.username.toLowerCase())
    .eq('role', 'creator')
    .single();

  if (error || !creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // Check if user is subscribed
  let isSubscribed = false;
  if (user) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('creator_id', creator.id)
      .eq('status', 'active')
      .single();

    isSubscribed = !!subscription;
  }

  return NextResponse.json({
    creator,
    isSubscribed,
  });
}

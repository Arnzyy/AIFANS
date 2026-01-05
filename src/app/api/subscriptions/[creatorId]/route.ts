import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/subscriptions/[creatorId] - Check subscription status
export async function GET(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ subscribed: false });
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, tier:subscription_tiers(name, price)')
    .eq('subscriber_id', user.id)
    .eq('creator_id', params.creatorId)
    .eq('status', 'active')
    .single();

  return NextResponse.json({
    subscribed: !!subscription,
    subscription: subscription || null,
  });
}

// DELETE /api/subscriptions/[creatorId] - Cancel subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('subscriber_id', user.id)
    .eq('creator_id', params.creatorId)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Decrement subscriber count
  await supabase
    .from('creator_profiles')
    .update({
      subscriber_count: supabase.rpc('decrement', { x: 1 })
    })
    .eq('user_id', params.creatorId);

  return NextResponse.json({ cancelled: true });
}

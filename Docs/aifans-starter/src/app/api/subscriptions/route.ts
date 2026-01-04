import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/subscriptions - Get user's subscriptions
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'active', 'expired', or all

  let query = supabase
    .from('subscriptions')
    .select(`
      *,
      creator:profiles!subscriptions_creator_id_fkey(
        id, username, display_name, avatar_url
      ),
      tier:subscription_tiers(name, price)
    `)
    .eq('subscriber_id', user.id)
    .order('created_at', { ascending: false });

  if (type === 'active') {
    query = query.eq('status', 'active');
  } else if (type === 'expired') {
    query = query.eq('status', 'expired');
  }

  const { data: subscriptions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscriptions });
}

// POST /api/subscriptions - Create subscription (MOCK PAYMENT)
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { creator_id, tier_id } = body;

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber_id', user.id)
    .eq('creator_id', creator_id)
    .eq('status', 'active')
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
  }

  // Get tier details
  const { data: tier } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('id', tier_id)
    .single();

  if (!tier) {
    return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
  }

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (tier.duration_months || 1));

  // ============================================
  // MOCK PAYMENT - In production, this would:
  // 1. Create CCBill payment session
  // 2. Redirect user to CCBill
  // 3. Wait for webhook confirmation
  // 4. Then create subscription
  // ============================================
  
  // For local testing, we just create the subscription directly
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      subscriber_id: user.id,
      creator_id,
      tier_id,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: expiresAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create mock transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    creator_id,
    type: 'subscription',
    amount: tier.price,
    platform_fee: Math.round(tier.price * 0.2),
    creator_amount: Math.round(tier.price * 0.8),
    status: 'completed',
    description: `Subscription to ${tier.name}`,
  });

  // Increment subscriber count
  await supabase
    .from('creator_profiles')
    .update({ 
      subscriber_count: supabase.rpc('increment', { x: 1 }) 
    })
    .eq('user_id', creator_id);

  return NextResponse.json({ 
    subscription,
    message: 'MOCK: Subscription created without payment (dev mode)'
  }, { status: 201 });
}

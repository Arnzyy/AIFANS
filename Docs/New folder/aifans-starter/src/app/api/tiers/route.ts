import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tiers - Get creator's subscription tiers
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: tiers, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('creator_id', user.id)
    .order('price', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tiers });
}

// POST /api/tiers - Create new subscription tier
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify creator
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'creator') {
    return NextResponse.json({ error: 'Only creators can manage tiers' }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, price, duration_months, benefits, is_featured } = body;

  if (!name || !price || price < 100) {
    return NextResponse.json({ error: 'Name and price (min £1) required' }, { status: 400 });
  }

  // Check tier limit (max 5)
  const { count } = await supabase
    .from('subscription_tiers')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', user.id);

  if (count && count >= 5) {
    return NextResponse.json({ error: 'Maximum 5 tiers allowed' }, { status: 400 });
  }

  const { data: tier, error } = await supabase
    .from('subscription_tiers')
    .insert({
      creator_id: user.id,
      name,
      description,
      price,
      duration_months: duration_months || 1,
      benefits: benefits || [],
      is_featured: is_featured || false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tier }, { status: 201 });
}

// PATCH /api/tiers - Update tier
export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Tier ID required' }, { status: 400 });
  }

  // Verify ownership
  const { data: tier } = await supabase
    .from('subscription_tiers')
    .select('creator_id')
    .eq('id', id)
    .single();

  if (!tier || tier.creator_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { data: updated, error } = await supabase
    .from('subscription_tiers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tier: updated });
}

// DELETE /api/tiers - Delete tier
export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Tier ID required' }, { status: 400 });
  }

  // Verify ownership
  const { data: tier } = await supabase
    .from('subscription_tiers')
    .select('creator_id')
    .eq('id', id)
    .single();

  if (!tier || tier.creator_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Soft delete by deactivating
  await supabase
    .from('subscription_tiers')
    .update({ is_active: false })
    .eq('id', id);

  return NextResponse.json({ deleted: true });
}

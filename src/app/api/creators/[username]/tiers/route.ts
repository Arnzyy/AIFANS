import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper to check if string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/creators/[username]/tiers - Get a creator's public subscription tiers
// Accepts either username or creator ID (UUID)
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const supabase = await createServerClient();
  const identifier = params.username;

  if (!identifier) {
    return NextResponse.json({ error: 'Creator identifier required' }, { status: 400 });
  }

  let creatorId = identifier;

  // If not a UUID, look up the creator by username to get their ID
  if (!isUUID(identifier)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', identifier.toLowerCase())
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }
    creatorId = profile.id;
  }

  // Fetch active tiers for this creator
  const { data: tiers, error } = await supabase
    .from('subscription_tiers')
    .select('id, name, description, price, duration_months, is_featured, is_active')
    .eq('creator_id', creatorId)
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching tiers:', error);
    return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
  }

  // Map to the format expected by SubscribeModal
  const formattedTiers = (tiers || []).map(tier => ({
    id: tier.id,
    name: tier.name,
    description: tier.description || '',
    price: tier.price, // Already in cents
    duration_months: tier.duration_months || 1,
    is_featured: tier.is_featured || false,
  }));

  return NextResponse.json({ tiers: formattedTiers });
}

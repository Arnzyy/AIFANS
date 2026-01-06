// ===========================================
// TOKEN CHECKOUT API
// Create Stripe checkout for token purchase
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createTokenCheckout } from '@/lib/tokens/token-service';

// POST - Create checkout session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pack_sku, success_url, cancel_url } = body;

    if (!pack_sku) {
      return NextResponse.json({ error: 'Pack SKU required' }, { status: 400 });
    }

    const result = await createTokenCheckout(
      supabase,
      user.id,
      pack_sku,
      success_url || `${process.env.NEXT_PUBLIC_APP_URL}/wallet?purchase=success`,
      cancel_url || `${process.env.NEXT_PUBLIC_APP_URL}/wallet?purchase=cancelled`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}

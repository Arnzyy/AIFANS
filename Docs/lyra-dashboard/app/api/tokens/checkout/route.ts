// ===========================================
// TOKEN CHECKOUT API
// /api/tokens/checkout/route.ts
// Create Stripe Checkout session for token purchase
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/tokens/token-service';

// POST - Create checkout session
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pack_sku, success_url, cancel_url } = body;

    if (!pack_sku) {
      return NextResponse.json({ error: 'Pack SKU required' }, { status: 400 });
    }

    // Default URLs if not provided
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const finalSuccessUrl = success_url || `${baseUrl}/wallet?purchase=success`;
    const finalCancelUrl = cancel_url || `${baseUrl}/wallet?purchase=cancelled`;

    const result = await createCheckoutSession(
      supabase,
      user.id,
      pack_sku,
      finalSuccessUrl,
      finalCancelUrl
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

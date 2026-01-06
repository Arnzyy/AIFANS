// ===========================================
// API ROUTE: /api/creator/stripe-connect
// Stripe Connect onboarding
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CreatorService } from '@/lib/creators/creator-service';

// POST - Create Stripe Connect link
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { return_url, refresh_url } = body;

    const creatorService = new CreatorService(supabase);
    const result = await creatorService.createStripeConnectAccount(
      user.id,
      return_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/onboarding?step=3&return=true`,
      refresh_url || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/onboarding?step=3&refresh=true`
    );

    return NextResponse.json({
      url: result.url,
      account_id: result.accountId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Sync Stripe Connect status
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorService = new CreatorService(supabase);
    const creator = await creatorService.syncStripeConnectStatus(user.id);

    return NextResponse.json({ creator });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

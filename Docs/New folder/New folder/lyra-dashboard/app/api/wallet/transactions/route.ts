// ===========================================
// WALLET TRANSACTIONS API
// /api/wallet/transactions/route.ts
// Get transaction history
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getTransactionHistory } from '@/lib/tokens/token-service';

// GET - Get transaction history
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const transactions = await getTransactionHistory(supabase, user.id, limit, offset);

    return NextResponse.json({ transactions });

  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

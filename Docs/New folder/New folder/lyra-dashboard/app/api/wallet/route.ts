// ===========================================
// WALLET API
// /api/wallet/route.ts
// Get wallet balance, transaction history
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getWallet, getTransactionHistory } from '@/lib/tokens/token-service';

// GET - Get wallet and balance
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wallet = await getWallet(supabase, user.id);

    return NextResponse.json({
      balance: wallet.balance_tokens,
      lifetime_purchased: wallet.lifetime_purchased,
      lifetime_spent: wallet.lifetime_spent,
    });

  } catch (error) {
    console.error('Get wallet error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

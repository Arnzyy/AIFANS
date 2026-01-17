// ===========================================
// WALLET API
// Get wallet balance and transaction history
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getWallet } from '@/lib/tokens/token-service';

// GET - Get wallet and balance
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const wallet = await getWallet(supabase, user.id);

      return NextResponse.json({
        balance: wallet.balance_tokens,
        lifetime_purchased: wallet.lifetime_purchased || 0,
        lifetime_spent: wallet.lifetime_spent || 0,
      });
    } catch (walletError: any) {
      // If wallet table doesn't exist or other DB error, return default values
      console.warn('Wallet not available:', walletError.message);
      return NextResponse.json({
        balance: 0,
        lifetime_purchased: 0,
        lifetime_spent: 0,
      });
    }
  } catch (error) {
    console.error('Get wallet error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

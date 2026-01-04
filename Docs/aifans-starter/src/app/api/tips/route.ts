import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/tips - Send tip to creator (MOCK PAYMENT)
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { creator_id, amount, message } = body;

  if (!creator_id || !amount || amount < 100) {
    return NextResponse.json({ error: 'Creator ID and amount (min £1) required' }, { status: 400 });
  }

  // Verify creator exists
  const { data: creator } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', creator_id)
    .eq('role', 'creator')
    .single();

  if (!creator) {
    return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
  }

  // ============================================
  // MOCK PAYMENT - In production:
  // 1. Check user has credits/payment method
  // 2. Process payment via CCBill
  // 3. Then create transaction
  // ============================================

  // Create transaction record
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      creator_id,
      type: 'tip',
      amount,
      platform_fee: Math.round(amount * 0.2),
      creator_amount: Math.round(amount * 0.8),
      status: 'completed',
      description: message || 'Tip',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create notification for creator (if notifications table exists)
  try {
    await supabase.from('notifications').insert({
      user_id: creator_id,
      type: 'tip',
      title: 'New Tip!',
      body: `Someone sent you a £${(amount / 100).toFixed(2)} tip${message ? `: "${message}"` : ''}`,
      data: { transaction_id: transaction.id },
    });
  } catch (e) {
    // Notifications table might not exist yet
  }

  return NextResponse.json({ 
    transaction,
    message: 'MOCK: Tip sent without actual payment (dev mode)'
  }, { status: 201 });
}

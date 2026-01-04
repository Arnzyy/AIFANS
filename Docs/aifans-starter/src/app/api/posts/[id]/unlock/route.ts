import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/posts/[id]/unlock - Unlock PPV post (MOCK PAYMENT)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get post
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (!post.is_ppv) {
    return NextResponse.json({ error: 'Post is not PPV' }, { status: 400 });
  }

  // Check if already purchased
  const { data: existing } = await supabase
    .from('post_purchases')
    .select('id')
    .eq('post_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already purchased' }, { status: 400 });
  }

  // ============================================
  // MOCK PAYMENT - In production:
  // 1. Check user has credits/payment method
  // 2. Process payment via CCBill
  // 3. Then create purchase record
  // ============================================

  // Create purchase record
  const { error: purchaseError } = await supabase
    .from('post_purchases')
    .insert({
      post_id: params.id,
      user_id: user.id,
      amount: post.ppv_price,
    });

  if (purchaseError) {
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }

  // Create transaction
  await supabase.from('transactions').insert({
    user_id: user.id,
    creator_id: post.creator_id,
    type: 'ppv',
    amount: post.ppv_price,
    platform_fee: Math.round(post.ppv_price * 0.2),
    creator_amount: Math.round(post.ppv_price * 0.8),
    status: 'completed',
    description: 'PPV Post Unlock',
  });

  return NextResponse.json({ 
    unlocked: true,
    message: 'MOCK: Post unlocked without payment (dev mode)'
  });
}

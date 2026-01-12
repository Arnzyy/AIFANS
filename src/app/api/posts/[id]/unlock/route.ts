import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getWallet } from '@/lib/tokens/token-service';

// POST /api/posts/[id]/unlock - Unlock PPV post using wallet tokens
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get post with creator info
    const { data: post } = await supabase
      .from('posts')
      .select('*, creator:profiles!posts_creator_id_fkey(username, display_name)')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (!post.is_ppv || !post.ppv_price) {
      return NextResponse.json({ error: 'Post is not PPV' }, { status: 400 });
    }

    // Check if already purchased
    const { data: existing } = await supabase
      .from('post_purchases')
      .select('id')
      .eq('post_id', postId)
      .eq('buyer_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 400 });
    }

    // Convert price to tokens (ppv_price is stored in pence, e.g., 200 = £2.00)
    // 250 tokens = £1 = 100 pence, so: pence * 2.5 = tokens
    const priceInPence = post.ppv_price;
    const priceInTokens = Math.round(priceInPence * 2.5);

    // Get user's wallet balance
    const wallet = await getWallet(supabase, user.id);
    const balance = wallet.balance_tokens;

    // Check if user has enough tokens
    if (balance < priceInTokens) {
      return NextResponse.json({
        error: 'Insufficient tokens',
        insufficientBalance: true,
        balance,
        required: priceInTokens,
        shortfall: priceInTokens - balance,
      }, { status: 400 });
    }

    // Deduct tokens from wallet
    const newBalance = balance - priceInTokens;
    const { error: walletError } = await supabase
      .from('token_wallets')
      .update({
        balance_tokens: newBalance,
        lifetime_spent: (wallet.lifetime_spent || 0) + priceInTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (walletError) {
      console.error('Wallet update error:', walletError);
      return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
    }

    // Log transaction in token ledger
    await supabase.from('token_ledger').insert({
      user_id: user.id,
      type: 'DEBIT',
      reason: 'PPV_UNLOCK',
      amount_tokens: priceInTokens,
      balance_after: newBalance,
      description: `Unlocked PPV post from ${post.creator?.display_name || post.creator?.username || 'creator'}`,
    });

    // Create purchase record (price_paid is in decimal GBP)
    const { error: purchaseError } = await supabase
      .from('post_purchases')
      .insert({
        post_id: postId,
        buyer_id: user.id,
        price_paid: priceInPence / 100, // Convert pence to pounds decimal
      });

    if (purchaseError) {
      console.error('Purchase record error:', purchaseError);
      // Refund the tokens if purchase record fails
      await supabase
        .from('token_wallets')
        .update({
          balance_tokens: balance,
          lifetime_spent: wallet.lifetime_spent || 0,
        })
        .eq('user_id', user.id);
      return NextResponse.json({ error: 'Failed to create purchase record' }, { status: 500 });
    }

    // Credit creator (70% share)
    const platformFee = 0.3;
    const creatorShare = Math.floor(priceInTokens * (1 - platformFee));
    const creatorShareGbpMinor = Math.floor(priceInPence * (1 - platformFee));

    await supabase.from('creator_payout_ledger').insert({
      creator_id: post.creator_id,
      type: 'ppv_sale',
      amount_tokens: creatorShare,
      amount_gbp_minor: creatorShareGbpMinor,
      status: 'pending',
      reference_id: postId,
    });

    return NextResponse.json({
      success: true,
      newBalance,
      tokensSpent: priceInTokens,
    });

  } catch (error: any) {
    console.error('PPV unlock error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unlock post' },
      { status: 500 }
    );
  }
}

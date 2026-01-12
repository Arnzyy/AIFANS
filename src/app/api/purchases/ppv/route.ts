// ===========================================
// API ROUTE: /api/purchases/ppv/route.ts
// PPV content purchase using WALLET TOKENS
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getWallet } from '@/lib/tokens/token-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_id, creator_id } = await request.json();

    if (!content_id || !creator_id) {
      return NextResponse.json(
        { error: 'content_id and creator_id required' },
        { status: 400 }
      );
    }

    // Get content details from posts table
    const { data: content } = await supabase
      .from('posts')
      .select('id, caption, ppv_price, user_id, creator_id, creator:profiles!posts_creator_id_fkey(username, display_name)')
      .eq('id', content_id)
      .eq('is_ppv', true)
      .single();

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Check if already purchased (check both tables for backwards compatibility)
    const { data: existingPurchase } = await supabase
      .from('post_purchases')
      .select('id')
      .eq('post_id', content_id)
      .eq('buyer_id', user.id)
      .single();

    const { data: legacyPurchase } = await supabase
      .from('ppv_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', content_id)
      .single();

    if (existingPurchase || legacyPurchase) {
      return NextResponse.json({
        success: true,
        already_owned: true,
        message: 'Content already unlocked',
      });
    }

    // ppv_price is in pence (e.g., 200 = £2.00)
    // Convert to tokens: 250 tokens = £1 = 100 pence
    // So: pence * 2.5 = tokens
    const priceInPence = content.ppv_price || 0;
    const priceInTokens = Math.round(priceInPence * 2.5);

    // Get user's wallet
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
      description: `Unlocked PPV content from ${content.creator?.display_name || content.creator?.username || 'creator'}`,
    });

    // Create purchase record in post_purchases (unified table)
    const { error: purchaseError } = await supabase
      .from('post_purchases')
      .insert({
        post_id: content_id,
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
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
    }

    // Credit creator (70% share)
    const platformFee = 0.3;
    const creatorShare = Math.floor(priceInTokens * (1 - platformFee));
    const creatorShareGbpMinor = Math.floor(priceInPence * (1 - platformFee));
    const actualCreatorId = content.creator_id || content.user_id;

    await supabase.from('creator_payout_ledger').insert({
      creator_id: actualCreatorId,
      type: 'ppv_sale',
      amount_tokens: creatorShare,
      amount_gbp_minor: creatorShareGbpMinor,
      status: 'pending',
      reference_id: content_id,
    });

    return NextResponse.json({
      success: true,
      newBalance,
      tokensSpent: priceInTokens,
      message: 'Content unlocked!',
    });
  } catch (error: any) {
    console.error('PPV purchase error:', error);
    return NextResponse.json({ error: 'Purchase failed' }, { status: 500 });
  }
}

// GET - Check purchase status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('content_id');

    if (!contentId) {
      return NextResponse.json({ error: 'content_id required' }, { status: 400 });
    }

    const { data: purchase } = await supabase
      .from('ppv_purchases')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('post_id', contentId)
      .single();

    return NextResponse.json({
      is_unlocked: !!purchase,
      purchased_at: purchase?.created_at,
    });
  } catch (error) {
    console.error('Check purchase error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

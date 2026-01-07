import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/ppv/[id]/purchase - Purchase PPV content
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get PPV offer
    const { data: offer, error: offerError } = await supabase
      .from('ppv_offers')
      .select('*')
      .eq('id', params.id)
      .eq('is_active', true)
      .single();

    if (offerError || !offer) {
      return NextResponse.json(
        { error: 'PPV offer not found' },
        { status: 404 }
      );
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('ppv_entitlements')
      .select('id')
      .eq('user_id', user.id)
      .eq('ppv_offer_id', params.id)
      .single();

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'Already purchased', already_owned: true },
        { status: 400 }
      );
    }

    // Check user balance
    const { data: wallet } = await supabase
      .from('token_wallets')
      .select('balance_tokens')
      .eq('user_id', user.id)
      .single();

    const balance = wallet?.balance_tokens || 0;

    if (balance < offer.price_tokens) {
      return NextResponse.json(
        { error: 'Insufficient tokens', balance, required: offer.price_tokens },
        { status: 400 }
      );
    }

    // Use spend_tokens RPC function if available, otherwise manual deduction
    // Try to call spend_tokens function
    const { data: spendResult, error: spendError } = await supabase
      .rpc('spend_tokens', {
        p_user_id: user.id,
        p_amount: offer.price_tokens,
        p_reason: 'ppv_purchase',
        p_creator_id: offer.creator_id,
        p_reference_id: params.id,
      });

    if (spendError) {
      // Fallback to manual deduction if function doesn't exist
      console.log('spend_tokens RPC not available, using manual deduction');

      // Deduct from wallet
      const { error: walletError } = await supabase
        .from('token_wallets')
        .update({
          balance_tokens: balance - offer.price_tokens,
          lifetime_spent: (wallet as Record<string, number>)?.lifetime_spent || 0 + offer.price_tokens,
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Log transaction
      await supabase
        .from('token_ledger')
        .insert({
          user_id: user.id,
          type: 'spend',
          reason: 'ppv_purchase',
          amount_tokens: -offer.price_tokens,
          balance_after: balance - offer.price_tokens,
          reference_id: params.id,
        });
    }

    // Create entitlement
    const { data: entitlement, error: entitlementError } = await supabase
      .from('ppv_entitlements')
      .insert({
        user_id: user.id,
        ppv_offer_id: params.id,
        amount_tokens: offer.price_tokens,
        purchased_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (entitlementError) throw entitlementError;

    // Update offer stats
    await supabase
      .from('ppv_offers')
      .update({
        purchase_count: offer.purchase_count + 1,
        total_revenue: offer.total_revenue + offer.price_tokens,
      })
      .eq('id', params.id);

    // Credit creator (70% share)
    const platformFee = 0.3;
    const creatorShare = Math.floor(offer.price_tokens * (1 - platformFee));

    await supabase
      .from('creator_payout_ledger')
      .insert({
        creator_id: offer.creator_id,
        type: 'ppv_sale',
        amount_tokens: creatorShare,
        amount_gbp_minor: Math.floor(creatorShare / 250 * 100), // Convert to pence
        status: 'pending',
        reference_id: params.id,
      });

    return NextResponse.json({
      success: true,
      entitlement,
      new_balance: balance - offer.price_tokens,
      content_ids: offer.content_ids,
    });
  } catch (error) {
    console.error('Error purchasing PPV:', error);
    return NextResponse.json(
      { error: 'Failed to complete purchase' },
      { status: 500 }
    );
  }
}

// GET /api/ppv/[id]/purchase - Check if user owns PPV
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data: entitlement } = await supabase
      .from('ppv_entitlements')
      .select('*')
      .eq('user_id', user.id)
      .eq('ppv_offer_id', params.id)
      .single();

    return NextResponse.json({
      owned: !!entitlement,
      entitlement,
    });
  } catch (error) {
    console.error('Error checking PPV ownership:', error);
    return NextResponse.json(
      { error: 'Failed to check ownership' },
      { status: 500 }
    );
  }
}

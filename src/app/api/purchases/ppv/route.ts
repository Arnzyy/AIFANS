// ===========================================
// API ROUTE: /api/purchases/ppv/route.ts
// PPV content purchase endpoint
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { recordEarning } from '@/lib/tax/tax-service';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

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
      .select('id, caption, ppv_price, user_id')
      .eq('id', content_id)
      .eq('is_ppv', true)
      .single();

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.user_id !== creator_id) {
      return NextResponse.json({ error: 'Content mismatch' }, { status: 400 });
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('ppv_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', content_id)
      .single();

    if (existingPurchase) {
      // Already unlocked - just return success
      return NextResponse.json({
        success: true,
        already_owned: true,
        message: 'Content already unlocked',
      });
    }

    const price = content.ppv_price || 0;

    // If no Stripe configured or price is 0, unlock directly (dev mode)
    if (!stripe || price === 0) {
      // Record purchase
      await supabase.from('ppv_purchases').insert({
        user_id: user.id,
        post_id: content_id,
        amount: price,
      });

      // Record creator earnings (for DAC7)
      if (price > 0) {
        const platformFee = price * 0.2; // 20% platform fee for content
        await recordEarning(supabase, {
          creator_id: creator_id,
          user_id: user.id,
          gross_amount: price,
          platform_fee: platformFee,
          type: 'ppv',
          reference_id: content_id,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Content unlocked!',
      });
    }

    // Get user's Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: profile?.stripe_customer_id || undefined,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: content.caption || 'Premium Content',
              description: `PPV content unlock`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/chat/${creator_id}?purchase=success&content=${content_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/chat/${creator_id}?purchase=cancelled`,
      metadata: {
        user_id: user.id,
        content_id: content_id,
        creator_id: creator_id,
        type: 'ppv',
      },
    });

    return NextResponse.json({
      requires_checkout: true,
      checkout_url: session.url,
    });
  } catch (error: any) {
    console.error('PPV purchase error:', error);

    // Handle Stripe card errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        {
          error: error.message,
          requires_action: error.code === 'authentication_required',
        },
        { status: 402 }
      );
    }

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

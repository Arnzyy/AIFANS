// ===========================================
// API ROUTE: /api/purchases/ppv/route.ts
// PPV content purchase endpoint
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_id, creator_id } = await request.json();

    if (!content_id || !creator_id) {
      return NextResponse.json({ error: 'content_id and creator_id required' }, { status: 400 });
    }

    // Get content details
    const { data: content } = await supabase
      .from('content')
      .select('id, title, price, creator_id')
      .eq('id', content_id)
      .eq('is_ppv', true)
      .single();

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.creator_id !== creator_id) {
      return NextResponse.json({ error: 'Content mismatch' }, { status: 400 });
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .single();

    if (existingPurchase) {
      // Already unlocked - just return success
      return NextResponse.json({ 
        success: true, 
        already_owned: true,
        message: 'Content already unlocked' 
      });
    }

    // Get user's payment method (assuming saved)
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id, default_payment_method')
      .eq('user_id', user.id)
      .single();

    if (!customer?.default_payment_method) {
      // Return checkout URL instead
      const session = await stripe.checkout.sessions.create({
        customer: customer?.stripe_customer_id,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: content.title || 'Premium Content',
              description: `PPV content from creator`,
            },
            unit_amount: Math.round(content.price * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_URL}/chat/${creator_id}?purchase=success&content=${content_id}`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/chat/${creator_id}?purchase=cancelled`,
        metadata: {
          user_id: user.id,
          content_id: content_id,
          creator_id: creator_id,
          type: 'ppv',
        },
      });

      return NextResponse.json({ 
        requires_checkout: true,
        checkout_url: session.url 
      });
    }

    // Charge immediately with saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(content.price * 100),
      currency: 'gbp',
      customer: customer.stripe_customer_id,
      payment_method: customer.default_payment_method,
      off_session: true,
      confirm: true,
      metadata: {
        user_id: user.id,
        content_id: content_id,
        creator_id: creator_id,
        type: 'ppv',
      },
    });

    if (paymentIntent.status === 'succeeded') {
      // Record purchase
      await supabase.from('purchases').insert({
        user_id: user.id,
        content_id: content_id,
        creator_id: creator_id,
        amount: content.price,
        stripe_payment_intent_id: paymentIntent.id,
        type: 'ppv',
      });

      // Record creator earnings (for DAC7)
      const platformFee = content.price * 0.20; // 20% platform fee for content
      const creatorEarnings = content.price * 0.80;

      await supabase.from('creator_earnings').insert({
        creator_id: creator_id,
        user_id: user.id,
        amount: creatorEarnings,
        platform_fee: platformFee,
        type: 'ppv',
        reference_id: content_id,
        stripe_payment_intent_id: paymentIntent.id,
      });

      return NextResponse.json({ 
        success: true,
        message: 'Content unlocked!' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Payment failed',
        status: paymentIntent.status 
      }, { status: 402 });
    }

  } catch (error: any) {
    console.error('PPV purchase error:', error);
    
    // Handle Stripe card errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json({ 
        error: error.message,
        requires_action: error.code === 'authentication_required',
      }, { status: 402 });
    }

    return NextResponse.json({ error: 'Purchase failed' }, { status: 500 });
  }
}

// GET - Check purchase status
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('content_id');

    if (!contentId) {
      return NextResponse.json({ error: 'content_id required' }, { status: 400 });
    }

    const { data: purchase } = await supabase
      .from('purchases')
      .select('id, created_at')
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .single();

    return NextResponse.json({ 
      is_unlocked: !!purchase,
      purchased_at: purchase?.created_at 
    });

  } catch (error) {
    console.error('Check purchase error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

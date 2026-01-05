import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { stripe, toCents } from '@/lib/stripe';
import { getCurrency, convertCurrency } from '@/lib/stripe/currency';

// POST /api/tips - Create Stripe Checkout for tip
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creator_id, amount, message } = await request.json();

    // Amount is expected in pence/cents
    if (!creator_id || !amount || amount < 100) {
      return NextResponse.json(
        { error: 'Creator ID and amount (min £1/$1) required' },
        { status: 400 }
      );
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

    // Detect currency from request geo
    const country = request.geo?.country;
    const currency = getCurrency(country);

    // Convert amount if needed (amount comes in as base currency - GBP)
    const convertedAmount = convertCurrency(amount, 'gbp', currency);

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // Create Stripe Checkout Session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Tip to ${creator.display_name || creator.username}`,
              description: message || 'Tip',
            },
            unit_amount: convertedAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        creator_id: creator_id,
        type: 'tip',
        message: message || '',
        original_amount_gbp: amount.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=tip`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('Tip checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create tip checkout' },
      { status: 500 }
    );
  }
}

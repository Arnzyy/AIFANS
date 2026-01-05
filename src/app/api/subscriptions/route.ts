import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { stripe, calculateFees, toCents } from '@/lib/stripe';
import { getCurrency, convertCurrency, type Currency } from '@/lib/stripe/currency';

// Get user's subscriptions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'active', 'expired', 'all'

    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        creator:profiles!subscriptions_creator_id_fkey(
          id, username, display_name, avatar_url
        ),
        tier:subscription_tiers(name, price_monthly, benefits)
      `)
      .eq('subscriber_id', user.id)
      .order('created_at', { ascending: false });

    if (type === 'active') {
      query = query.eq('status', 'active');
    } else if (type === 'expired') {
      query = query.eq('status', 'expired');
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subscriptions });

  } catch (error: any) {
    console.error('Subscriptions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

// Create a new subscription via Stripe Checkout
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, tierId, billingPeriod = 'monthly' } = await request.json();

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .single();

    if (existingSub) {
      return NextResponse.json(
        { error: 'Already subscribed to this creator' },
        { status: 400 }
      );
    }

    // Detect currency from request geo
    const country = request.geo?.country;
    const currency = getCurrency(country);

    // Fetch tier details
    let tier = null;
    if (tierId) {
      const { data } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('id', tierId)
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .single();
      tier = data;
    } else {
      // Get default tier (lowest price)
      const { data } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })
        .limit(1)
        .single();
      tier = data;
    }

    if (!tier) {
      // Free subscription - no payment required
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          subscriber_id: user.id,
          creator_id: creatorId,
          tier_id: null,
          status: 'active',
          price_paid: 0,
          billing_period: 'monthly',
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Increment subscriber count
      await supabase.rpc('increment_subscriber_count', { p_creator_id: creatorId });

      return NextResponse.json({ subscription, paymentRequired: false });
    }

    // Get price based on billing period
    let priceGBP: number;
    let interval: 'month' | 'year' = 'month';
    let intervalCount = 1;

    switch (billingPeriod) {
      case '3_month':
        priceGBP = tier.price_3_month || tier.price_monthly * 3;
        interval = 'month';
        intervalCount = 3;
        break;
      case 'yearly':
        priceGBP = tier.price_yearly || tier.price_monthly * 12;
        interval = 'year';
        intervalCount = 1;
        break;
      default:
        priceGBP = tier.price_monthly;
        interval = 'month';
        intervalCount = 1;
    }

    // Convert price to user's currency (prices stored in GBP)
    const priceInCents = toCents(priceGBP);
    const convertedPriceInCents = convertCurrency(priceInCents, 'gbp', currency);

    // Get creator info for product name
    const { data: creator } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', creatorId)
      .single();

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
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `${creator?.display_name || creator?.username} - ${tier.name}`,
              description: tier.description || `Subscription to ${creator?.display_name || creator?.username}`,
            },
            unit_amount: convertedPriceInCents,
            recurring: {
              interval: interval,
              interval_count: intervalCount,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        creator_id: creatorId,
        tier_id: tier.id,
        billing_period: billingPeriod,
        type: 'subscription',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          creator_id: creatorId,
          tier_id: tier.id,
          billing_period: billingPeriod,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
    });

    return NextResponse.json({
      paymentRequired: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('id');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership and get Stripe subscription ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*, external_subscription_id')
      .eq('id', subscriptionId)
      .eq('subscriber_id', user.id)
      .single();

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Cancel in Stripe (at period end)
    if (subscription.external_subscription_id) {
      try {
        await stripe.subscriptions.update(subscription.external_subscription_id, {
          cancel_at_period_end: true,
        });
      } catch (stripeError: any) {
        console.error('Stripe cancellation error:', stripeError);
        // Continue to update local status even if Stripe fails
      }
    }

    // Update local status
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { stripe, calculateFees, toCents } from '@/lib/stripe';
import { getCurrency, convertCurrency, type Currency } from '@/lib/stripe/currency';

// Helper to get app URL with fallback
function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) {
    // Ensure it has a scheme
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  }
  // Fallback for Vercel deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'https://www.joinlyra.com';
}

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

    const { creatorId, tierId, billingPeriod = 'monthly', subscriptionType = 'content' } = await request.json();

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    // Validate subscription type
    if (!['content', 'chat', 'bundle'].includes(subscriptionType)) {
      return NextResponse.json(
        { error: 'Invalid subscription type' },
        { status: 400 }
      );
    }

    // Check if creatorId is actually a model ID (not a profile ID)
    // Models have a creator_id field pointing to the actual creator's profile
    let modelId: string | null = null;
    let actualCreatorId = creatorId;
    let modelData: any = null;

    const { data: model } = await supabase
      .from('creator_models')
      .select('id, creator_id, name, subscription_price')
      .eq('id', creatorId)
      .single();

    if (model) {
      // It's a model subscription
      modelId = model.id;
      actualCreatorId = model.creator_id;
      modelData = model;
    }

    // Check if already subscribed based on type
    // Use actualCreatorId (profile ID) since that's what we store in subscriptions
    const { data: existingSubs } = await supabase
      .from('subscriptions')
      .select('id, subscription_type')
      .eq('subscriber_id', user.id)
      .eq('creator_id', actualCreatorId)
      .eq('status', 'active');

    const existingTypes = (existingSubs || []).map(s => s.subscription_type || 'content');

    // Check for conflicts
    if (subscriptionType === 'bundle') {
      if (existingTypes.includes('content') || existingTypes.includes('chat') || existingTypes.includes('bundle')) {
        return NextResponse.json(
          { error: 'You already have an active subscription to this creator' },
          { status: 400 }
        );
      }
    } else if (subscriptionType === 'content') {
      if (existingTypes.includes('content') || existingTypes.includes('bundle')) {
        return NextResponse.json(
          { error: 'You already have content access for this creator' },
          { status: 400 }
        );
      }
    } else if (subscriptionType === 'chat') {
      if (existingTypes.includes('chat') || existingTypes.includes('bundle')) {
        return NextResponse.json(
          { error: 'You already have chat access for this creator' },
          { status: 400 }
        );
      }
    }

    // Detect currency from request geo
    const country = request.geo?.country;
    const currency = getCurrency(country);

    // Fetch creator profile for chat pricing
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('ai_chat_price_per_message')
      .eq('user_id', actualCreatorId)
      .single();

    // Chat monthly price (default £9.99 if not set)
    const chatMonthlyPriceGBP = 9.99; // Fixed monthly chat price

    // Fetch tier details (for content subscriptions)
    let tier = null;

    // If this is a model subscription, use the model's subscription_price directly
    if (modelData && subscriptionType !== 'chat') {
      // Create a virtual tier from the model's price
      tier = {
        id: `model-${modelData.id}`,
        price_monthly: modelData.subscription_price || 999, // Default to £9.99
        name: 'Fan',
      };
    } else if (subscriptionType !== 'chat' && tierId) {
      const { data } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('id', tierId)
        .eq('creator_id', actualCreatorId)
        .eq('is_active', true)
        .single();
      tier = data;
    } else if (subscriptionType !== 'chat') {
      // Get default tier (lowest price)
      const { data } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('creator_id', actualCreatorId)
        .eq('is_active', true)
        .order('price_monthly', { ascending: true })
        .limit(1)
        .single();
      tier = data;
    }

    // For content/bundle, we need a tier (or model price)
    if ((subscriptionType === 'content' || subscriptionType === 'bundle') && !tier) {
      return NextResponse.json(
        { error: 'No subscription tier available for this creator' },
        { status: 400 }
      );
    }

    // Calculate pricing based on subscription type
    let interval: 'month' | 'year' = 'month';
    let intervalCount = 1;
    let monthlyPriceGBP = 0;

    // Convert from pence to pounds (price_monthly is stored in pence)
    const contentMonthlyPrice = (tier?.price_monthly || 0) / 100;

    switch (subscriptionType) {
      case 'content':
        monthlyPriceGBP = contentMonthlyPrice;
        break;
      case 'chat':
        monthlyPriceGBP = chatMonthlyPriceGBP;
        break;
      case 'bundle':
        // 15% discount on combined price
        monthlyPriceGBP = (contentMonthlyPrice + chatMonthlyPriceGBP) * 0.85;
        break;
    }

    // Apply billing period multiplier and discounts
    let priceGBP: number;
    switch (billingPeriod) {
      case '3_month':
        priceGBP = monthlyPriceGBP * 3 * 0.9; // 10% discount
        interval = 'month';
        intervalCount = 3;
        break;
      case 'yearly':
        priceGBP = monthlyPriceGBP * 12 * 0.75; // 25% discount
        interval = 'year';
        intervalCount = 1;
        break;
      default:
        priceGBP = monthlyPriceGBP;
        interval = 'month';
        intervalCount = 1;
    }

    // Convert price to user's currency (prices stored in GBP)
    const priceInCents = toCents(priceGBP);
    const convertedPriceInCents = convertCurrency(priceInCents, 'gbp', currency);

    // Get display name for product - use model name if model subscription
    let displayName = '';
    if (modelData) {
      displayName = modelData.name;
    } else {
      const { data: creator } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', creatorId)
        .single();
      displayName = creator?.display_name || creator?.username || 'Creator';
    }

    // Build product name based on subscription type
    const productNames: Record<string, string> = {
      content: `${displayName} - Fan Access`,
      chat: `${displayName} - AI Chat`,
      bundle: `${displayName} - Fan + Chat Bundle`,
    };
    const productDescriptions: Record<string, string> = {
      content: `Access to all posts and content from ${displayName}`,
      chat: `AI chat with ${displayName}`,
      bundle: `Full access: posts, content, and AI chat`,
    };

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
              name: productNames[subscriptionType],
              description: productDescriptions[subscriptionType],
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
        tier_id: tier?.id || '',
        billing_period: billingPeriod,
        type: 'subscription',
        subscription_type: subscriptionType,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          creator_id: creatorId,
          tier_id: tier?.id || '',
          billing_period: billingPeriod,
          subscription_type: subscriptionType,
        },
      },
      success_url: `${getAppUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/checkout/cancel`,
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

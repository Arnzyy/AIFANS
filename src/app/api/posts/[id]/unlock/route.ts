import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { stripe, toCents } from '@/lib/stripe';
import { getCurrency, convertCurrency } from '@/lib/stripe/currency';

// POST /api/posts/[id]/unlock - Create Stripe Checkout for PPV unlock
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get post with creator info
    const { data: post } = await supabase
      .from('posts')
      .select('*, creator:profiles!posts_creator_id_fkey(username, display_name)')
      .eq('id', params.id)
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
      .eq('post_id', params.id)
      .eq('buyer_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 400 });
    }

    // Detect currency from request geo
    const country = request.geo?.country;
    const currency = getCurrency(country);

    // Convert price (stored in GBP decimal, convert to cents then to user currency)
    const priceInCents = toCents(post.ppv_price);
    const convertedPrice = convertCurrency(priceInCents, 'gbp', currency);

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

    // Create Stripe Checkout Session for PPV
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Unlock Post from ${post.creator?.display_name || post.creator?.username}`,
              description: 'PPV Content Unlock',
            },
            unit_amount: convertedPrice,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        creator_id: post.creator_id,
        post_id: params.id,
        type: 'ppv',
        original_price_gbp: post.ppv_price.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=ppv&post_id=${params.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('PPV unlock error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create PPV checkout' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { stripe, calculateFees, fromCents } from '@/lib/stripe';
import Stripe from 'stripe';

// Lazy-initialized Supabase client for webhooks (bypasses RLS)
let supabaseInstance: SupabaseClient | null = null;

function getSupabase() {
  if (!supabaseInstance) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables not configured');
    }
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabaseInstance;
}

const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop];
  },
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: any) {
  const metadata = session.metadata || {};
  const type = metadata.type;

  console.log('Checkout completed:', type, metadata);

  switch (type) {
    case 'subscription':
      await createSubscription(session);
      break;
    case 'tip':
      await createTipTransaction(session);
      break;
    case 'ppv':
      await createPPVPurchase(session);
      break;
    case 'token_purchase':
      await handleTokenPurchase(session);
      break;
  }
}

async function createSubscription(session: any) {
  const { user_id, creator_id, tier_id, billing_period, subscription_type = 'content' } = session.metadata || {};

  if (!user_id || !creator_id) {
    console.error('Missing metadata for subscription');
    return;
  }

  if (!session.subscription) {
    console.error('No subscription ID in checkout session');
    return;
  }

  console.log('Creating subscription for user:', user_id, 'creator:', creator_id, 'type:', subscription_type);

  // Get subscription from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  ) as any;

  // Calculate period dates with fallbacks
  const now = new Date();
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const currentPeriodStart = stripeSubscription.current_period_start
    ? new Date(stripeSubscription.current_period_start * 1000)
    : now;
  const currentPeriodEnd = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : oneMonthFromNow;

  // Check if this is a model subscription (tier_id starts with "model-")
  const isModelSubscription = tier_id && tier_id.startsWith('model-');
  const actualTierId = isModelSubscription ? null : tier_id;

  // API now sends the correct profile ID in metadata, no resolution needed
  let actualCreatorId = creator_id;

  // Get price info
  let pricePaid = 0;

  if (isModelSubscription) {
    // For model subscriptions, get the subscription price (creator_id already in metadata)
    const modelId = tier_id.replace('model-', '');
    const { data: model, error: modelError } = await supabase
      .from('creator_models')
      .select('subscription_price')
      .eq('id', modelId)
      .maybeSingle();

    if (modelError) {
      console.warn('Could not fetch model price for', modelId, modelError.message);
    }

    if (model) {
      pricePaid = (model.subscription_price || 999) / 100; // Convert pence to pounds
    }
  } else if (tier_id) {
    // For regular tier subscriptions
    const { data: tier, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', tier_id)
      .maybeSingle();

    if (tierError) {
      console.warn('Could not fetch tier price for', tier_id, tierError.message);
    }

    if (tier) {
      const priceField = billing_period === 'yearly'
        ? 'price_yearly'
        : billing_period === '3_month'
        ? 'price_3_month'
        : 'price_monthly';
      pricePaid = (tier[priceField] || tier.price_monthly || 0) / 100; // Convert pence to pounds
    }
  }

  const fees = calculateFees(Math.round(pricePaid * 100));

  // Check if subscription already exists (idempotency)
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('external_subscription_id', stripeSubscription.id)
    .maybeSingle();

  if (existingSub) {
    console.log('Subscription already exists for Stripe sub:', stripeSubscription.id);
    return;
  }

  console.log('Inserting subscription:', {
    subscriber_id: user_id,
    creator_id: actualCreatorId,
    tier_id: actualTierId,
    subscription_type: subscription_type,
    external_subscription_id: stripeSubscription.id,
  });

  // Create subscription record (minimal columns for compatibility)
  // Note: creator_id must be a profile ID (foreign key constraint)
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      subscriber_id: user_id,
      creator_id: actualCreatorId,
      tier_id: actualTierId,
      status: 'active',
      subscription_type: subscription_type,
      current_period_end: currentPeriodEnd.toISOString(),
      external_subscription_id: stripeSubscription.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create subscription:', error);
    console.error('Insert data was:', { user_id, creator_id, tier_id: actualTierId, subscription_type });
    throw new Error(`Subscription insert failed: ${error.message}`);
  }

  // Subscription type labels for display
  const typeLabels: Record<string, string> = {
    content: 'Fan',
    chat: 'Chat',
    bundle: 'Fan + Chat',
  };
  const typeLabel = typeLabels[subscription_type] || 'Fan';

  // Create transaction record
  const { error: txError } = await supabase.from('transactions').insert({
    user_id: user_id,
    creator_id: actualCreatorId,
    transaction_type: 'subscription',
    status: 'completed',
    gross_amount: fromCents(fees.grossAmount),
    platform_fee: fromCents(fees.platformFee),
    net_amount: fromCents(fees.netAmount),
    subscription_id: subscription.id,
    external_transaction_id: session.payment_intent as string,
    description: `New ${typeLabel} subscription`,
    completed_at: new Date().toISOString(),
  });

  if (txError) {
    // Subscription created but transaction failed - log for reconciliation
    console.error('RECONCILIATION NEEDED: Subscription created but transaction record failed', {
      subscription_id: subscription.id,
      user_id,
      creator_id: actualCreatorId,
      error: txError.message,
    });
  }

  // Increment subscriber count (only for content or bundle, as they access content)
  if (subscription_type === 'content' || subscription_type === 'bundle') {
    const { error: countError } = await supabase.rpc('increment_subscriber_count', { p_creator_id: actualCreatorId });
    if (countError) {
      console.warn('Failed to increment subscriber count (non-critical):', countError.message);
    }
  }

  // Create notification for creator
  try {
    const notificationBody = subscription_type === 'chat'
      ? 'Someone subscribed to chat with you!'
      : subscription_type === 'bundle'
      ? 'Someone subscribed to your full package (content + chat)!'
      : 'Someone subscribed to your content!';

    await supabase.from('notifications').insert({
      user_id: actualCreatorId,
      type: 'new_subscriber',
      title: 'New Subscriber!',
      body: notificationBody,
      actor_id: user_id,
    });
  } catch (e) {
    // Notifications table might not exist
  }

  console.log('Subscription created:', subscription.id, 'type:', subscription_type);
}

async function createTipTransaction(session: any) {
  const { user_id, creator_id, message, original_amount_gbp } = session.metadata || {};

  if (!user_id || !creator_id) {
    console.error('Missing metadata for tip');
    return;
  }

  // Use original GBP amount for consistency
  const amountInCents = original_amount_gbp
    ? parseInt(original_amount_gbp)
    : session.amount_total || 0;

  const fees = calculateFees(amountInCents);

  const { error: tipError } = await supabase.from('transactions').insert({
    user_id: user_id,
    creator_id: creator_id,
    transaction_type: 'tip',
    status: 'completed',
    gross_amount: fromCents(fees.grossAmount),
    platform_fee: fromCents(fees.platformFee),
    net_amount: fromCents(fees.netAmount),
    external_transaction_id: session.payment_intent as string,
    description: message || 'Tip',
    completed_at: new Date().toISOString(),
  });

  if (tipError) {
    console.error('Failed to create tip transaction:', tipError);
    throw new Error('Failed to record tip transaction');
  }

  // Create notification
  try {
    await supabase.from('notifications').insert({
      user_id: creator_id,
      type: 'tip',
      title: 'New Tip!',
      body: `Someone sent you a £${fromCents(fees.grossAmount).toFixed(2)} tip${message ? `: "${message}"` : ''}`,
      actor_id: user_id,
    });
  } catch (e) {
    // Notifications table might not exist
  }

  console.log('Tip transaction created');
}

async function createPPVPurchase(session: any) {
  const { user_id, creator_id, post_id, original_price_gbp } = session.metadata || {};

  if (!user_id || !creator_id || !post_id) {
    console.error('Missing metadata for PPV');
    return;
  }

  // Use original GBP price
  const priceInCents = original_price_gbp
    ? Math.round(parseFloat(original_price_gbp) * 100)
    : session.amount_total || 0;

  const fees = calculateFees(priceInCents);

  // Create purchase record
  const { error: purchaseError } = await supabase.from('post_purchases').insert({
    post_id: post_id,
    buyer_id: user_id,
    price_paid: fromCents(fees.grossAmount),
  });

  if (purchaseError) {
    console.error('Failed to create PPV purchase record:', purchaseError);
    throw new Error('Failed to record PPV purchase');
  }

  // Create transaction
  const { error: txError } = await supabase.from('transactions').insert({
    user_id: user_id,
    creator_id: creator_id,
    transaction_type: 'ppv',
    status: 'completed',
    gross_amount: fromCents(fees.grossAmount),
    platform_fee: fromCents(fees.platformFee),
    net_amount: fromCents(fees.netAmount),
    post_id: post_id,
    external_transaction_id: session.payment_intent as string,
    description: 'PPV Post Unlock',
    completed_at: new Date().toISOString(),
  });

  if (txError) {
    console.error('Failed to create PPV transaction:', txError);
    // Purchase record exists but transaction failed - log for manual reconciliation
    console.error('RECONCILIATION NEEDED: PPV purchase recorded but transaction failed', {
      post_id,
      user_id,
      creator_id,
      payment_intent: session.payment_intent,
    });
  }

  console.log('PPV purchase created for post:', post_id);
}

async function handleTokenPurchase(session: any) {
  const { purchase_id, user_id, tokens } = session.metadata || {};

  if (!purchase_id || !user_id || !tokens) {
    console.error('Missing metadata for token purchase');
    return;
  }

  const tokenAmount = parseInt(tokens, 10);
  console.log('Processing token purchase:', purchase_id, 'for user:', user_id, 'tokens:', tokenAmount);

  // Update purchase status to COMPLETED (with idempotency check)
  // CRITICAL: Only credit tokens if we successfully transition from PENDING to COMPLETED
  const { data: updatedPurchase, error: purchaseError } = await supabase
    .from('token_pack_purchases')
    .update({
      status: 'COMPLETED',
      stripe_payment_intent_id: session.payment_intent,
    })
    .eq('id', purchase_id)
    .eq('status', 'PENDING') // Only update if still pending (idempotency)
    .select('id')
    .maybeSingle();

  if (purchaseError) {
    console.error('Failed to update token purchase:', purchaseError);
    throw new Error('Failed to update token purchase status');
  }

  // If no row was updated, this purchase was already processed - skip token credit
  if (!updatedPurchase) {
    console.log('Token purchase already processed (idempotency check):', purchase_id);
    return;
  }

  // Credit tokens to user's wallet using atomic increment
  // Use upsert with raw SQL increment to prevent race conditions
  const { data: existingWallet } = await supabase
    .from('token_wallets')
    .select('id')
    .eq('user_id', user_id)
    .maybeSingle();

  if (existingWallet) {
    // Atomic increment for existing wallet
    const { error: updateError } = await supabase.rpc('credit_tokens', {
      p_user_id: user_id,
      p_amount: tokenAmount,
    }).maybeSingle();

    // Fallback to regular update if RPC doesn't exist
    if (updateError && updateError.message.includes('function')) {
      // RPC not available, use regular update (less safe but functional)
      const { data: wallet } = await supabase
        .from('token_wallets')
        .select('balance_tokens, lifetime_purchased')
        .eq('user_id', user_id)
        .single();

      if (wallet) {
        const { error: fallbackError } = await supabase
          .from('token_wallets')
          .update({
            balance_tokens: wallet.balance_tokens + tokenAmount,
            lifetime_purchased: (wallet.lifetime_purchased || 0) + tokenAmount,
          })
          .eq('user_id', user_id);

        if (fallbackError) {
          console.error('Failed to update wallet:', fallbackError);
          throw new Error('Failed to credit tokens to wallet');
        }
      }
    } else if (updateError) {
      console.error('Failed to credit tokens:', updateError);
      throw new Error('Failed to credit tokens to wallet');
    }
  } else {
    // Create new wallet with tokens
    const { error: insertError } = await supabase
      .from('token_wallets')
      .insert({
        user_id: user_id,
        balance_tokens: tokenAmount,
        lifetime_purchased: tokenAmount,
      });

    if (insertError) {
      console.error('Failed to create wallet:', insertError);
      throw new Error('Failed to create wallet');
    }
  }

  // Add ledger entry
  try {
    // Get current balance for ledger entry
    const { data: currentWallet } = await supabase
      .from('token_wallets')
      .select('balance_tokens')
      .eq('user_id', user_id)
      .maybeSingle();

    await supabase.from('token_ledger').insert({
      user_id: user_id,
      entry_type: 'PURCHASE',
      amount_tokens: tokenAmount,
      balance_after: currentWallet?.balance_tokens || tokenAmount,
      reference_type: 'token_pack_purchase',
      reference_id: purchase_id,
      description: `Purchased ${tokenAmount} tokens`,
    });
  } catch (e) {
    // Ledger might not exist
    console.warn('Could not create ledger entry:', e);
  }

  console.log('Token purchase completed:', purchase_id, 'credited', tokenAmount, 'tokens to user', user_id);
}

async function handleInvoicePaid(invoice: any) {
  // Handle subscription renewals
  if (!invoice.subscription) return;

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*, tier:subscription_tiers(*)')
    .eq('external_subscription_id', invoice.subscription)
    .maybeSingle();

  if (subError) {
    console.error('Error looking up subscription for invoice:', invoice.id, subError.message);
    // Don't throw - log for investigation but don't block webhook processing
    return;
  }

  if (!subscription) {
    console.error('Subscription not found for invoice:', invoice.id, '- may be processed out of order');
    return;
  }

  // Get the Stripe subscription for period info
  const stripeSubscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  ) as any;

  // Update subscription period
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', subscription.id);

  if (updateError) {
    console.error('Failed to update subscription period:', updateError);
    throw new Error('Failed to update subscription period');
  }

  // Create renewal transaction
  const fees = calculateFees(invoice.amount_paid);

  const { error: txError } = await supabase.from('transactions').insert({
    user_id: subscription.subscriber_id,
    creator_id: subscription.creator_id,
    transaction_type: 'subscription',
    status: 'completed',
    gross_amount: fromCents(fees.grossAmount),
    platform_fee: fromCents(fees.platformFee),
    net_amount: fromCents(fees.netAmount),
    subscription_id: subscription.id,
    external_transaction_id: invoice.payment_intent as string,
    description: `Subscription renewal`,
    completed_at: new Date().toISOString(),
  });

  if (txError) {
    // Subscription updated but transaction failed - log for reconciliation
    console.error('RECONCILIATION NEEDED: Subscription renewed but transaction record failed', {
      subscription_id: subscription.id,
      invoice_id: invoice.id,
      error: txError.message,
    });
  }

  console.log('Subscription renewed:', subscription.id);
}

async function handleSubscriptionUpdated(stripeSubscription: any) {
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('external_subscription_id', stripeSubscription.id)
    .maybeSingle();

  if (subError) {
    console.error('Error looking up subscription for update:', stripeSubscription.id, subError.message);
    return;
  }

  if (!subscription) {
    console.warn('Subscription not found for update:', stripeSubscription.id, '- may not exist yet');
    return;
  }

  // Map Stripe status to our status
  let status: string;
  switch (stripeSubscription.status) {
    case 'active':
      status = 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
      status = 'cancelled';
      break;
    default:
      status = 'active';
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: status,
      current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', subscription.id);

  if (updateError) {
    console.error('Failed to update subscription status:', updateError);
    throw new Error('Failed to update subscription status');
  }

  console.log('Subscription updated:', subscription.id, status);
}

async function handleSubscriptionDeleted(stripeSubscription: any) {
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('id, creator_id')
    .eq('external_subscription_id', stripeSubscription.id)
    .maybeSingle();

  if (subError) {
    console.error('Error looking up subscription for deletion:', stripeSubscription.id, subError.message);
    return;
  }

  if (!subscription) {
    console.warn('Subscription not found for deletion:', stripeSubscription.id);
    return;
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'expired',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  if (updateError) {
    console.error('Failed to expire subscription:', updateError);
    throw new Error('Failed to expire subscription');
  }

  // Decrement subscriber count
  const { error: countError } = await supabase.rpc('decrement_subscriber_count', { p_creator_id: subscription.creator_id });
  if (countError) {
    console.warn('Failed to decrement subscriber count (non-critical):', countError.message);
  }

  console.log('Subscription deleted/expired:', subscription.id);
}

async function handleChargeRefunded(charge: any) {
  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) return;

  const { error } = await supabase
    .from('transactions')
    .update({ status: 'refunded' })
    .eq('external_transaction_id', paymentIntentId);

  if (error) {
    console.error('Failed to mark transaction as refunded:', error);
    // Log for reconciliation - refund happened in Stripe but our record wasn't updated
    console.error('RECONCILIATION NEEDED: Refund processed but transaction not updated', {
      payment_intent_id: paymentIntentId,
      charge_id: charge.id,
    });
  }

  console.log('Charge refunded:', paymentIntentId);
}
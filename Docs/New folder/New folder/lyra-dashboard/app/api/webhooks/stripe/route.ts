// ===========================================
// STRIPE WEBHOOK HANDLER
// /api/webhooks/stripe/route.ts
// Handles checkout.session.completed, charge.refunded
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { handleCheckoutComplete, handleRefund } from '@/lib/tokens/token-service';

// Use service role for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Only process token pack purchases (not subscriptions)
        if (session.mode === 'payment' && session.metadata?.purchase_id) {
          console.log('Processing token purchase:', session.id);
          await handleCheckoutComplete(supabase, session);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Processing refund:', charge.id);
        await handleRefund(supabase, charge);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Find and update purchase if exists
        const { data: purchase } = await supabase
          .from('token_pack_purchases')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (purchase) {
          await supabase
            .from('token_pack_purchases')
            .update({
              status: 'FAILED',
              error_message: paymentIntent.last_payment_error?.message,
            })
            .eq('id', purchase.id);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

// Disable body parsing for Stripe webhooks (need raw body for signature)
export const config = {
  api: {
    bodyParser: false,
  },
};

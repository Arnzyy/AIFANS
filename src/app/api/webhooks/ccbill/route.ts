import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// CCBill Webhook handler
// This handles subscription events from CCBill

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for webhooks
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)

    // Verify webhook authenticity
    const isValid = verifyWebhookSignature(params)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const eventType = params.get('eventType') || params.get('type')
    const userId = params.get('userId') || params.get('X-userId')
    const creatorId = params.get('creatorId') || params.get('X-creatorId')
    const tierId = params.get('tierId') || params.get('X-tierId')
    const subscriptionId = params.get('subscription_id') || params.get('subscriptionId')
    const transactionId = params.get('transactionId')

    console.log('CCBill webhook received:', { eventType, userId, creatorId, tierId })

    switch (eventType) {
      case 'NewSaleSuccess':
      case 'newSale':
        // New subscription created
        if (userId && creatorId) {
          await handleNewSubscription({
            userId,
            creatorId,
            tierId: tierId || undefined,
            ccbillSubscriptionId: subscriptionId || undefined,
            transactionId: transactionId || undefined
          })
        }
        break

      case 'RenewalSuccess':
      case 'renewal':
        // Subscription renewed
        if (subscriptionId) {
          await handleRenewal(subscriptionId)
        }
        break

      case 'Cancellation':
      case 'cancellation':
        // Subscription cancelled
        if (subscriptionId) {
          await handleCancellation(subscriptionId)
        }
        break

      case 'Chargeback':
      case 'chargeback':
        // Handle chargeback - serious event
        if (subscriptionId) {
          await handleChargeback(subscriptionId, userId || '')
        }
        break

      case 'Refund':
      case 'refund':
        // Handle refund
        if (transactionId) {
          await handleRefund(transactionId)
        }
        break

      case 'Expiration':
      case 'expiration':
        // Subscription expired
        if (subscriptionId) {
          await handleExpiration(subscriptionId)
        }
        break

      default:
        console.log('Unhandled CCBill event:', eventType)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('CCBill webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

function verifyWebhookSignature(params: URLSearchParams): boolean {
  const secret = process.env.CCBILL_WEBHOOK_SECRET
  if (!secret) {
    console.warn('CCBILL_WEBHOOK_SECRET not set, skipping verification')
    return true // For development
  }

  const signature = params.get('responseDigest') || ''
  const subscriptionId = params.get('subscriptionId') || ''
  const amount = params.get('billedAmount') || ''

  // CCBill MD5 digest format
  const expectedDigest = crypto
    .createHash('md5')
    .update(`${subscriptionId}${amount}${secret}`)
    .digest('hex')

  return signature.toLowerCase() === expectedDigest.toLowerCase()
}

async function handleNewSubscription(data: {
  userId: string
  creatorId: string
  tierId?: string
  ccbillSubscriptionId?: string
  transactionId?: string
}) {
  // Get tier info
  let tier = null
  let durationMonths = 1

  if (data.tierId) {
    const { data: tierData } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', data.tierId)
      .single()
    tier = tierData
    durationMonths = tier?.duration_months || 1
  }

  // Calculate expiration
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

  // Create subscription
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      subscriber_id: data.userId,
      creator_id: data.creatorId,
      tier_id: data.tierId || null,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      ccbill_subscription_id: data.ccbillSubscriptionId,
      auto_renew: true
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create subscription:', error)
    return
  }

  // Record transaction
  if (tier) {
    await supabase.from('transactions').insert({
      user_id: data.userId,
      creator_id: data.creatorId,
      type: 'subscription',
      amount: tier.price,
      status: 'completed',
      ccbill_transaction_id: data.transactionId
    })
  }

  // Increment subscriber count
  await supabase.rpc('increment_subscriber_count', { p_creator_id: data.creatorId })

  console.log('New subscription created:', subscription.id)
}

async function handleRenewal(ccbillSubscriptionId: string) {
  // Find subscription by CCBill ID
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, tier:subscription_tiers(*)')
    .eq('ccbill_subscription_id', ccbillSubscriptionId)
    .single()

  if (!subscription) {
    console.error('Subscription not found for renewal:', ccbillSubscriptionId)
    return
  }

  // Extend expiration
  const durationMonths = subscription.tier?.duration_months || 1
  const newExpiresAt = new Date(subscription.expires_at)
  newExpiresAt.setMonth(newExpiresAt.getMonth() + durationMonths)

  await supabase
    .from('subscriptions')
    .update({
      expires_at: newExpiresAt.toISOString(),
      status: 'active'
    })
    .eq('id', subscription.id)

  // Record transaction
  if (subscription.tier) {
    await supabase.from('transactions').insert({
      user_id: subscription.subscriber_id,
      creator_id: subscription.creator_id,
      type: 'subscription',
      amount: subscription.tier.price,
      status: 'completed'
    })
  }

  console.log('Subscription renewed:', subscription.id)
}

async function handleCancellation(ccbillSubscriptionId: string) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('ccbill_subscription_id', ccbillSubscriptionId)
    .single()

  if (!subscription) return

  await supabase
    .from('subscriptions')
    .update({
      auto_renew: false,
      status: 'cancelled'
    })
    .eq('id', subscription.id)

  console.log('Subscription cancelled:', subscription.id)
}

async function handleChargeback(ccbillSubscriptionId: string, userId: string) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, creator_id')
    .eq('ccbill_subscription_id', ccbillSubscriptionId)
    .single()

  if (!subscription) return

  // Immediately revoke access
  await supabase
    .from('subscriptions')
    .update({
      status: 'revoked',
      auto_renew: false
    })
    .eq('id', subscription.id)

  // Flag user account for review
  await supabase
    .from('profiles')
    .update({
      flags: supabase.sql`array_append(COALESCE(flags, '{}'), 'chargeback')`
    })
    .eq('id', userId)

  // Decrement subscriber count
  await supabase.rpc('decrement_subscriber_count', { p_creator_id: subscription.creator_id })

  console.log('Chargeback handled for subscription:', subscription.id)
}

async function handleRefund(transactionId: string) {
  await supabase
    .from('transactions')
    .update({ status: 'refunded' })
    .eq('ccbill_transaction_id', transactionId)

  console.log('Refund processed for transaction:', transactionId)
}

async function handleExpiration(ccbillSubscriptionId: string) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, creator_id')
    .eq('ccbill_subscription_id', ccbillSubscriptionId)
    .single()

  if (!subscription) return

  await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('id', subscription.id)

  // Decrement subscriber count
  await supabase.rpc('decrement_subscriber_count', { p_creator_id: subscription.creator_id })

  console.log('Subscription expired:', subscription.id)
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Get user's subscriptions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'active', 'expired', 'all'

    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        creator:profiles!subscriptions_creator_id_fkey(
          id, username, display_name, avatar_url
        ),
        tier:subscription_tiers(name, price, benefits)
      `)
      .eq('subscriber_id', user.id)
      .order('created_at', { ascending: false })

    if (type === 'active') {
      query = query.eq('status', 'active')
    } else if (type === 'expired') {
      query = query.eq('status', 'expired')
    }

    const { data: subscriptions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subscriptions })

  } catch (error: any) {
    console.error('Subscriptions error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}

// Create a new subscription (initiate payment)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { creatorId, tierId } = await request.json()

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      )
    }

    // Check if already subscribed
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .single()

    if (existingSub) {
      return NextResponse.json(
        { error: 'Already subscribed to this creator' },
        { status: 400 }
      )
    }

    // Fetch tier details
    let tier = null
    if (tierId) {
      const { data } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('id', tierId)
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .single()
      tier = data
    } else {
      // Get default tier (lowest price)
      const { data } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .order('price', { ascending: true })
        .limit(1)
        .single()
      tier = data
    }

    if (!tier) {
      // Free subscription
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          subscriber_id: user.id,
          creator_id: creatorId,
          tier_id: null,
          status: 'active',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Increment subscriber count
      await supabase.rpc('increment_subscriber_count', { p_creator_id: creatorId })

      return NextResponse.json({ subscription, paymentRequired: false })
    }

    // For paid subscriptions, generate CCBill payment URL
    // This would integrate with CCBill's FlexForms API
    const paymentUrl = generateCCBillPaymentUrl({
      userId: user.id,
      creatorId,
      tierId: tier.id,
      amount: tier.price,
      durationMonths: tier.duration_months
    })

    return NextResponse.json({
      paymentRequired: true,
      paymentUrl,
      tier
    })

  } catch (error: any) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

// Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('id')

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('subscriber_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Mark as cancelled (will expire at end of period)
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false
      })
      .eq('id', subscriptionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

// Generate CCBill payment URL helper
function generateCCBillPaymentUrl(params: {
  userId: string
  creatorId: string
  tierId: string
  amount: number
  durationMonths: number
}) {
  const ccbillSubAccountId = process.env.CCBILL_SUB_ACCOUNT_ID
  const ccbillFlexFormId = process.env.CCBILL_FLEX_FORM_ID

  // In production, this would generate a proper CCBill FlexForms URL
  // with encrypted parameters
  const baseUrl = 'https://api.ccbill.com/wap-frontflex/flexforms'

  const queryParams = new URLSearchParams({
    clientSubacc: ccbillSubAccountId || '',
    formName: ccbillFlexFormId || '',
    formPrice: (params.amount / 100).toFixed(2),
    formPeriod: params.durationMonths.toString(),
    userId: params.userId,
    creatorId: params.creatorId,
    tierId: params.tierId,
    currencyCode: '826', // GBP
  })

  return `${baseUrl}?${queryParams.toString()}`
}

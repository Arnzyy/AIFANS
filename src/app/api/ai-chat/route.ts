import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { buildSystemPrompt, createChatCompletion, buildConversationHistory, extractUserInfo, AIPersonality } from '@/lib/ai/chat'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { creatorId, message, conversationId } = await request.json()

    if (!creatorId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch the creator's AI personality
    const { data: personality, error: personalityError } = await supabase
      .from('ai_personalities')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .single()

    if (personalityError || !personality) {
      return NextResponse.json(
        { error: 'AI chat not available for this creator' },
        { status: 404 }
      )
    }

    // Check if user has access (subscription or pay-per-message)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .single()

    const hasAccess = !!subscription || personality.pricing_model === 'included'

    // For pay-per-message, check wallet balance
    if (personality.pricing_model === 'per_message' && !subscription) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single()

      if (!wallet || wallet.balance < personality.price_per_message) {
        return NextResponse.json(
          { error: 'Insufficient balance', required: personality.price_per_message },
          { status: 402 }
        )
      }

      // Deduct from wallet
      await supabase.rpc('deduct_wallet_balance', {
        p_user_id: user.id,
        p_amount: personality.price_per_message
      })

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        creator_id: creatorId,
        type: 'ai_chat',
        amount: personality.price_per_message,
        status: 'completed'
      })
    }

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .or(`participant1_id.eq.${creatorId},participant2_id.eq.${creatorId}`)
        .single()

      if (existingConv) {
        convId = existingConv.id
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: creatorId,
            is_ai_enabled: true
          })
          .select('id')
          .single()
        convId = newConv?.id
      }
    }

    // Fetch recent messages for context
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content, sender_id, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Build conversation history
    const messageHistory = (recentMessages || [])
      .reverse()
      .map(m => ({
        role: m.sender_id === user.id ? 'user' as const : 'assistant' as const,
        content: m.content
      }))

    // Fetch or create memory context
    const { data: memory } = await supabase
      .from('ai_chat_memory')
      .select('*')
      .eq('user_id', user.id)
      .eq('creator_id', creatorId)
      .single()

    const memoryContext = memory?.context || {}

    // Extract user info from the new message
    const extractedInfo = extractUserInfo(message)
    const updatedMemory = { ...memoryContext, ...extractedInfo }

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(personality as AIPersonality)

    // Build the full conversation
    const messages = buildConversationHistory(
      systemPrompt,
      [...messageHistory, { role: 'user', content: message }],
      {
        userName: updatedMemory.name,
        userDetails: updatedMemory,
      }
    )

    // Save user's message
    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      receiver_id: creatorId,
      content: message,
      is_ai_generated: false
    })

    // Generate AI response
    const aiResponse = await createChatCompletion({
      messages,
      temperature: 0.9,
      maxTokens: 500
    })

    // Save AI response
    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: creatorId,
      receiver_id: user.id,
      content: aiResponse,
      is_ai_generated: true
    })

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId)

    // Update memory
    if (extractedInfo && Object.keys(extractedInfo).length > 0) {
      await supabase.from('ai_chat_memory').upsert({
        user_id: user.id,
        creator_id: creatorId,
        context: updatedMemory
      }, { onConflict: 'user_id,creator_id' })
    }

    return NextResponse.json({
      response: aiResponse,
      conversationId: convId
    })

  } catch (error: any) {
    console.error('AI Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'AI chat failed' },
      { status: 500 }
    )
  }
}

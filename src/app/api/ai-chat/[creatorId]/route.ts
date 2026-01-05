import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { buildSystemPrompt, generateAIResponse } from '@/lib/ai/chat';

// GET /api/ai-chat/[creatorId] - Get AI chat session
export async function GET(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get creator's AI personality
  const { data: personality } = await supabase
    .from('ai_personalities')
    .select('*')
    .eq('creator_id', params.creatorId)
    .eq('is_active', true)
    .single();

  if (!personality) {
    return NextResponse.json({ error: 'AI chat not available for this creator' }, { status: 404 });
  }

  // Get or create session
  let { data: session } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('creator_id', params.creatorId)
    .single();

  if (!session) {
    const { data: newSession, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id: user.id,
        creator_id: params.creatorId,
        personality_id: personality.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    session = newSession;
  }

  // Get messages
  const { data: messages } = await supabase
    .from('ai_chat_messages')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })
    .limit(50);

  return NextResponse.json({
    session,
    personality: {
      name: personality.persona_name,
      avatar: personality.avatar_url,
    },
    messages: messages || [],
  });
}

// POST /api/ai-chat/[creatorId] - Send message to AI
export async function POST(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { message } = body;

  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  // Get creator's AI personality
  const { data: personality } = await supabase
    .from('ai_personalities')
    .select('*')
    .eq('creator_id', params.creatorId)
    .eq('is_active', true)
    .single();

  if (!personality) {
    return NextResponse.json({ error: 'AI chat not available' }, { status: 404 });
  }

  // Get session
  const { data: session } = await supabase
    .from('ai_chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('creator_id', params.creatorId)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Get user profile for context
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single();

  // Save user message
  await supabase.from('ai_chat_messages').insert({
    session_id: session.id,
    role: 'user',
    content: message,
  });

  // Get recent messages for context
  const { data: recentMessages } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('session_id', session.id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Build conversation history
  const conversationHistory = (recentMessages || []).reverse().map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Generate AI response
  const systemPrompt = buildSystemPrompt(personality as any);

  let aiResponse: string;
  try {
    aiResponse = await generateAIResponse(
      systemPrompt,
      conversationHistory,
      {
        name: userProfile?.display_name || userProfile?.username || 'User',
      }
    );
  } catch (err) {
    console.error('AI generation error:', err);
    aiResponse = "I'm having trouble responding right now. Please try again in a moment. 💕";
  }

  // Save AI response
  const { data: aiMessage } = await supabase
    .from('ai_chat_messages')
    .insert({
      session_id: session.id,
      role: 'assistant',
      content: aiResponse,
    })
    .select()
    .single();

  // Update session stats
  await supabase
    .from('ai_chat_sessions')
    .update({
      message_count: session.message_count + 2,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  // ============================================
  // MOCK PAYMENT - In production:
  // 1. Check pricing model (per_message, per_minute, included)
  // 2. Deduct credits or charge
  // 3. Log transaction
  // ============================================

  // For dev, just log it
  if (personality.pricing_model === 'per_message' && personality.price_per_message > 0) {
    await supabase.from('transactions').insert({
      user_id: user.id,
      creator_id: params.creatorId,
      type: 'ai_chat',
      amount: personality.price_per_message,
      platform_fee: Math.round(personality.price_per_message * 0.3),
      creator_amount: Math.round(personality.price_per_message * 0.7),
      status: 'completed',
      description: 'AI Chat message (MOCK)',
    });
  }

  return NextResponse.json({
    message: aiMessage,
    mock_notice: 'DEV MODE: No credits deducted'
  });
}

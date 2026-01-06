import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateChatResponse, checkCompliance } from '@/lib/ai/chat-service';
import { AIPersonalityFull } from '@/lib/ai/personality/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, message, conversationId } = await request.json();

    if (!creatorId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch the creator's AI personality
    const { data: personality, error: personalityError } = await supabase
      .from('ai_personalities')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .single();

    if (personalityError || !personality) {
      return NextResponse.json(
        { error: 'AI chat not available for this creator' },
        { status: 404 }
      );
    }

    // Check if user has access (subscription check - optional)
    // For now, allow access if personality exists and is active

    // Generate response using the new compliant chat service
    const result = await generateChatResponse(
      supabase as any,
      {
        subscriberId: user.id,
        creatorId,
        message,
        conversationId,
      },
      personality as AIPersonalityFull
    );

    // Log compliance issues if any (for monitoring)
    if (!result.passed_compliance && result.compliance_issues) {
      console.warn(`Compliance issues for creator ${creatorId}:`, result.compliance_issues);
    }

    return NextResponse.json({
      response: result.response,
      conversationId: result.conversationId,
    });

  } catch (error: any) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'AI chat failed' },
      { status: 500 }
    );
  }
}

// GET - Retrieve chat history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json({ error: 'Missing creatorId' }, { status: 400 });
    }

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant1_id.eq.${user.id},participant2_id.eq.${creatorId}),` +
        `and(participant1_id.eq.${creatorId},participant2_id.eq.${user.id})`
      )
      .single();

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    // Get messages - try chat_messages first, fall back to messages
    let { data: messages } = await supabase
      .from('chat_messages')
      .select('id, sender_id, content, created_at, is_ai_generated')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(50);

    // If no chat_messages, try the messages table
    if (!messages || messages.length === 0) {
      const { data: oldMessages } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, is_ai_generated')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })
        .limit(50);
      messages = oldMessages;
    }

    return NextResponse.json({
      messages: messages || [],
      conversationId: conversation.id,
    });

  } catch (error: any) {
    console.error('Get chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}

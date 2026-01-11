import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateMockResponse, ChatMessage } from '@/lib/ai/chat-service';
import { getCreatorByUsername } from '@/lib/data/creators';
import { cleanResponse } from '@/lib/ai/chat';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorUsername, creatorName, message, conversationHistory, modelId } = await request.json();

    if (!creatorUsername || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let displayName = creatorName;

    // First try to get mock creator data
    const mockCreator = getCreatorByUsername(creatorUsername.toLowerCase());

    if (mockCreator && mockCreator.hasAiChat) {
      displayName = mockCreator.displayName;
    } else {
      // If not a mock creator, check if it's a database model
      const { data: model } = await supabase
        .from('creator_models')
        .select('name, ai_chat_enabled')
        .or(`id.eq.${modelId || ''},username.eq.${creatorUsername}`)
        .eq('status', 'approved')
        .single();

      if (!model) {
        return NextResponse.json(
          { error: 'AI chat not available for this creator' },
          { status: 404 }
        );
      }

      displayName = model.name || creatorName;

      // For database models, save messages to persist conversation
      // Get or create conversation
      const { data: conv } = await supabase
        .from('conversations')
        .upsert({
          subscriber_id: user.id,
          creator_id: modelId,
          last_message_at: new Date().toISOString(),
        }, { onConflict: 'creator_id,subscriber_id' })
        .select('id')
        .single();

      const conversationId = conv?.id;

      // Format conversation history
      const history: ChatMessage[] = (conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Save user message
      if (conversationId) {
        await supabase.from('chat_messages').insert({
          conversation_id: conversationId,
          creator_id: modelId,
          subscriber_id: user.id,
          role: 'user',
          content: message,
        });
      }

      // Generate response
      const response = await generateMockResponse(displayName, message, history);
      const cleanedResponse = cleanResponse(response);

      // Save AI response
      if (conversationId) {
        await supabase.from('chat_messages').insert({
          conversation_id: conversationId,
          creator_id: modelId,
          subscriber_id: user.id,
          role: 'assistant',
          content: cleanedResponse,
        });
      }

      return NextResponse.json({
        response: cleanedResponse,
        mock: true,
        conversationId,
      });
    }

    // For mock creators (not database models), don't persist messages
    // Format conversation history
    const history: ChatMessage[] = (conversationHistory || []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Generate compliant AI response using the new chat service
    const response = await generateMockResponse(
      displayName,
      message,
      history
    );

    return NextResponse.json({
      response: cleanResponse(response),
      mock: true,
    });

  } catch (error: any) {
    console.error('Mock AI Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'AI chat failed' },
      { status: 500 }
    );
  }
}

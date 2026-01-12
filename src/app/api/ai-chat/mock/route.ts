import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateMockResponse, ChatMessage } from '@/lib/ai/chat-service';
import { getCreatorByUsername } from '@/lib/data/creators';
import { cleanResponse } from '@/lib/ai/chat';
import { buildChatContext, formatMemoryForPrompt, updateMemory } from '@/lib/ai/memory-system/memory-service';

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
      let conversationId: string | undefined;

      // First check if conversation exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${modelId}),` +
          `and(participant1_id.eq.${modelId},participant2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: modelId,
          })
          .select('id')
          .single();
        conversationId = newConv?.id;
      }

      // Format conversation history
      const history: ChatMessage[] = (conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Build memory context - this contains user's personal details (name, height, interests, etc.)
      let memoryContext = '';
      try {
        const context = await buildChatContext(supabase, user.id, modelId);
        memoryContext = formatMemoryForPrompt(context);
        console.log('Memory loaded for user:', {
          preferredName: context.memory?.preferred_name,
          personalFacts: context.memory?.personal_facts?.length || 0,
          interests: context.memory?.interests?.length || 0,
        });
      } catch (err) {
        console.log('Memory unavailable (non-critical):', err);
      }

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

      // Generate response with memory context
      const response = await generateMockResponse(displayName, message, history, memoryContext);
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

      // Update memory in background - extract facts from conversation
      const messagesForMemory = [
        ...history,
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: cleanedResponse }
      ];
      updateMemory(supabase, user.id, modelId, messagesForMemory).catch(err => {
        console.log('Memory update failed (non-critical):', err);
      });

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

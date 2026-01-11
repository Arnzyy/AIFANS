import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateMockResponse, ChatMessage } from '@/lib/ai/chat-service';
import { getCreatorByUsername } from '@/lib/data/creators';

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
    }

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
      response,
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

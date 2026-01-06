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

    const { creatorUsername, creatorName, message, conversationHistory } = await request.json();

    if (!creatorUsername || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get mock creator data
    const mockCreator = getCreatorByUsername(creatorUsername.toLowerCase());
    if (!mockCreator || !mockCreator.hasAiChat) {
      return NextResponse.json(
        { error: 'AI chat not available for this creator' },
        { status: 404 }
      );
    }

    // Format conversation history
    const history: ChatMessage[] = (conversationHistory || []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Generate compliant AI response using the new chat service
    const response = await generateMockResponse(
      mockCreator.displayName,
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

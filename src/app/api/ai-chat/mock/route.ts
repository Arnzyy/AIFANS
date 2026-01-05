import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateAIResponse, AIPersonality } from '@/lib/ai/chat';
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

    // Get user profile for personalization
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single();

    // Build a mock personality from creator data
    const personality: AIPersonality = {
      name: mockCreator.displayName,
      backstory: mockCreator.bio,
      location: mockCreator.location,
      personality_traits: mockCreator.tags,
      interests: mockCreator.tags,
      speaking_style: 'flirty, engaging, and warm',
      emoji_usage: 'moderate',
      response_length: 'medium',
    };

    // Format conversation history
    const history = (conversationHistory || []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Add the new message to history
    history.push({ role: 'user' as const, content: message });

    // Generate AI response
    const response = await generateAIResponse(
      personality,
      history,
      {
        name: userProfile?.display_name || userProfile?.username || 'User',
      }
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

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { buildPersonalityPrompt } from '@/lib/ai/personality/prompt-builder';
import { AIPersonalityFull } from '@/lib/ai/personality/types';
import { MASTER_SYSTEM_PROMPT } from '@/lib/ai/master-prompt';

// Mock responses for when API is unavailable
// Note: Compliant with LYRA rules (no emotional dependency)
const mockResponses = [
  "Hey there! 💕 What's on your mind?",
  "Mmm, that's really interesting! Tell me more? 😘",
  "You always know how to make me smile 💖",
  "I love chatting with you... what else is on your mind?",
  "That's so sweet of you to say! 🥰",
  "Ooh, I like where this is going... 😏",
  "You're such a tease! I love it 💋",
  "Well look who it is... you've got my attention 😏",
];

function getMockResponse(userMessage: string, personality: AIPersonalityFull): string {
  const lowerMessage = userMessage.toLowerCase();
  const name = personality.persona_name || 'I';
  const emoji = personality.emoji_usage === 'heavy' ? ' 💕😘' : personality.emoji_usage === 'moderate' ? ' 💕' : '';

  // Greetings
  if (lowerMessage.match(/\b(hello|hi|hey|hiya|yo)\b/)) {
    return `Hey you${emoji} ${name} here. What's on your mind?`;
  }

  // How are you / how's your day
  if (lowerMessage.match(/how.*(are you|you doing|your day|been|going)/)) {
    return `I'm good! Better now that you're here${emoji} How about you?`;
  }

  // Compliments
  if (lowerMessage.match(/\b(beautiful|pretty|hot|sexy|gorgeous|cute|stunning|amazing)\b/)) {
    return `Mm, flattery gets you places${emoji} What else you got?`;
  }

  // Questions about the AI
  if (lowerMessage.match(/\b(what do you|tell me about|who are you|what are you)\b/)) {
    return `I'm ${name}. Stick around and find out more${emoji}`;
  }

  // Flirty/suggestive
  if (lowerMessage.match(/\b(love|want|need|miss|think about)\b/)) {
    return `Bold${emoji} I like that energy.`;
  }

  // Generic but contextual fallback
  const fallbacks = [
    `Mm, tell me more${emoji}`,
    `I like where this is going${emoji}`,
    `You've got my attention${emoji}`,
    `Keep talking${emoji}`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Call Anthropic API
async function callAnthropic(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 300
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic API error response:', response.status, errorText);
    throw new Error(`Anthropic API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// POST /api/creator/ai-personality/test - Test AI personality in wizard
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { personality, messages } = await request.json();

    if (!personality) {
      return NextResponse.json({ error: 'Personality required' }, { status: 400 });
    }

    // Build the system prompt using MASTER + personality
    // This mirrors production behavior for accurate testing
    const systemPrompt = MASTER_SYSTEM_PROMPT + '\n\n' + buildPersonalityPrompt(personality as AIPersonalityFull);

    // Format messages for API
    const conversationMessages = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Try Anthropic API
    try {
      const response = await callAnthropic(systemPrompt, conversationMessages);
      return NextResponse.json({ response });
    } catch (error) {
      console.error('Anthropic API error:', error);

      // Check if API key exists
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY not set - using mock responses');
      }

      // Fall back to mock response
      const lastUserMessage = conversationMessages.filter((m: { role: string }) => m.role === 'user').pop();
      const mockResponse = getMockResponse(
        lastUserMessage?.content || 'hello',
        personality as AIPersonalityFull
      );

      return NextResponse.json({
        response: mockResponse,
        _debug: { usingMock: true, reason: error instanceof Error ? error.message : 'API error' }
      });
    }
  } catch (error) {
    console.error('Test chat error:', error);
    return NextResponse.json(
      { error: 'Test chat failed' },
      { status: 500 }
    );
  }
}

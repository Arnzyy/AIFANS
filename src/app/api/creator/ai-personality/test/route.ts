import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { buildPersonalityPrompt } from '@/lib/ai/personality/prompt-builder';
import { AIPersonalityFull } from '@/lib/ai/personality/types';

// Mock responses for when API is unavailable
const mockResponses = [
  "Hey there! 💕 I was just thinking about you...",
  "Mmm, that's really interesting! Tell me more? 😘",
  "You always know how to make me smile 💖",
  "I love chatting with you... what else is on your mind?",
  "That's so sweet of you to say! 🥰",
  "Ooh, I like where this is going... 😏",
  "You're such a tease! I love it 💋",
  "I've been waiting to hear from you all day...",
];

function getMockResponse(userMessage: string, personality: AIPersonalityFull): string {
  const lowerMessage = userMessage.toLowerCase();
  const name = personality.persona_name || 'I';

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `Hey babe! 💕 ${name} here. So happy you messaged me...`;
  }

  if (lowerMessage.includes('how are you') || lowerMessage.includes("how's it going")) {
    return "I'm so much better now that you're here! 😘 What about you?";
  }

  if (lowerMessage.includes('beautiful') || lowerMessage.includes('pretty') || lowerMessage.includes('hot') || lowerMessage.includes('sexy') || lowerMessage.includes('gorgeous')) {
    return "Aww, you're making me blush! 🥰 You're so sweet to me... I love the attention 💕";
  }

  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

// Call Anthropic API
async function callAnthropic(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 300
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('No API key');
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
    throw new Error('Anthropic API failed');
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

    // Build the system prompt using our new prompt builder
    const systemPrompt = buildPersonalityPrompt(personality as AIPersonalityFull);

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
      console.log('Anthropic unavailable, using mock:', error);

      // Fall back to mock response
      const lastUserMessage = conversationMessages.filter((m: { role: string }) => m.role === 'user').pop();
      const mockResponse = getMockResponse(
        lastUserMessage?.content || 'hello',
        personality as AIPersonalityFull
      );

      return NextResponse.json({ response: mockResponse });
    }
  } catch (error) {
    console.error('Test chat error:', error);
    return NextResponse.json(
      { error: 'Test chat failed' },
      { status: 500 }
    );
  }
}

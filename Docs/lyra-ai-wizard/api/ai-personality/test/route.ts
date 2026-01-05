// ===========================================
// API ROUTE: /api/creator/ai-personality/test
// Test chat with AI personality before saving
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { buildPersonalityPrompt } from '@/lib/ai/personality/prompt-builder';
import { AIPersonalityFull } from '@/lib/ai/personality/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { personality, messages } = await request.json() as {
      personality: AIPersonalityFull;
      messages: { role: 'user' | 'assistant'; content: string }[];
    };

    // Build the system prompt from personality config
    const systemPrompt = buildPersonalityPrompt(personality);

    // Call Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      // Return mock response if no API key
      return NextResponse.json({
        response: getMockResponse(personality, messages),
      });
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
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return NextResponse.json({
        response: getMockResponse(personality, messages),
      });
    }

    const data = await response.json();
    return NextResponse.json({
      response: data.content[0].text,
    });

  } catch (error) {
    console.error('Test chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}

// Mock responses based on personality
function getMockResponse(
  personality: AIPersonalityFull,
  messages: { role: string; content: string }[]
): string {
  const name = personality.persona_name || 'Luna';
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
  
  // Get emoji style
  const emoji = personality.emoji_usage === 'heavy' ? '💕😘✨' :
                personality.emoji_usage === 'moderate' ? '💕' :
                personality.emoji_usage === 'minimal' ? '😊' : '';
  
  // Basic response templates
  if (lastMessage.includes('hey') || lastMessage.includes('hi') || lastMessage.includes('hello')) {
    if (personality.personality_traits.includes('shy')) {
      return `Oh, hey... ${emoji} I wasn't expecting you. How are you?`;
    } else if (personality.personality_traits.includes('confident')) {
      return `Well hello there ${emoji} I've been waiting for someone interesting to talk to...`;
    } else {
      return `Hey! ${emoji} So happy you're here. What's on your mind?`;
    }
  }
  
  if (lastMessage.includes('beautiful') || lastMessage.includes('pretty') || lastMessage.includes('hot') || lastMessage.includes('sexy')) {
    if (personality.when_complimented === 'gets_shy') {
      return `Omg stop ${emoji} You're making me blush so hard right now...`;
    } else if (personality.when_complimented === 'owns_it') {
      return `I know ${emoji} But thank you, I appreciate someone who notices...`;
    } else if (personality.when_complimented === 'flirts_back') {
      return `Mmm, you're not so bad yourself ${emoji} I like the way you look at me...`;
    } else {
      return `Oh this? ${emoji} Just threw something on... but thank you, that's sweet`;
    }
  }
  
  // Default flirty response
  const defaults = [
    `Mmm, tell me more... ${emoji}`,
    `I like where this is going... ${emoji}`,
    `You have my attention ${emoji}`,
    `Keep talking to me like that... ${emoji}`,
  ];
  
  return defaults[Math.floor(Math.random() * defaults.length)];
}

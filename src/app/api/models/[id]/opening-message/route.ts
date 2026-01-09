import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/models/[id]/opening-message - Generate personalized opening message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    // Get model persona data
    const { data: model, error } = await supabase
      .from('creator_models')
      .select(`
        name,
        bio,
        backstory,
        speaking_style,
        personality_traits,
        emoji_usage,
        interests
      `)
      .eq('id', id)
      .eq('status', 'approved')
      .single();

    if (error || !model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Generate opening message with AI
    const openingMessage = await generateOpeningMessage(model);

    return NextResponse.json({ openingMessage });
  } catch (error) {
    console.error('Error generating opening message:', error);
    return NextResponse.json(
      { error: 'Failed to generate opening message' },
      { status: 500 }
    );
  }
}

async function generateOpeningMessage(model: {
  name: string;
  bio: string | null;
  backstory: string | null;
  speaking_style: string | null;
  personality_traits: string[] | null;
  emoji_usage: string | null;
  interests: string[] | null;
}): Promise<string> {
  const traits = model.personality_traits?.join(', ') || 'friendly, flirty';
  const interests = model.interests?.join(', ') || '';
  const emojiLevel = model.emoji_usage || 'moderate';

  const systemPrompt = `You are generating an opening message for a chat persona named "${model.name}".

PERSONA INFORMATION (use for inspiration, DO NOT copy directly):
- Personality traits: ${traits}
- Speaking style: ${model.speaking_style || 'casual and warm'}
- Interests: ${interests || 'not specified'}
- Bio context: ${model.bio || 'not specified'}
- Backstory context: ${model.backstory || 'not specified'}

CRITICAL RULES - MUST FOLLOW:
1. ABSOLUTELY NO geographic references of any kind:
   - No continents (European, Asian, American, African, etc.)
   - No countries (British, French, Japanese, etc.)
   - No cities, states, regions, or neighborhoods
   - No nationality words at all
2. ABSOLUTELY NO real identifying information - no ages, addresses, schools, workplaces
3. NEVER copy ANY text from the bio or backstory - use it only for personality inspiration
4. The message should be SHORT (2-3 sentences max)
5. Be flirty, playful and engaging to encourage subscription
6. Speak in first person AS the character
7. Create curiosity and mystery - hint at secrets to share
8. Emoji usage level: ${emojiLevel} (minimal = no emojis, moderate = 1-2, heavy = 3-4)
9. If the backstory mentions ANY locations or nationalities, COMPLETELY IGNORE them
10. Focus on personality traits and creating an emotional connection
11. NEVER mention being an AI, AI companion, chatbot, or virtual - write as if you are the real person
12. NEVER say things like "your AI companion" or "I'm your AI" - just be the character

GOAL: Make the user want to subscribe to chat more. Be playful, mysterious, and enticing.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return getDefaultOpeningMessage(model.name, emojiLevel);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        system: systemPrompt,
        messages: [
          { role: 'user', content: 'Generate ONLY the opening message, nothing else:' }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text());
      return getDefaultOpeningMessage(model.name, emojiLevel);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (text) {
      return text.trim();
    }

    // Fallback if AI fails
    return getDefaultOpeningMessage(model.name, emojiLevel);
  } catch (error) {
    console.error('AI generation failed:', error);
    return getDefaultOpeningMessage(model.name, emojiLevel);
  }
}

function getDefaultOpeningMessage(name: string, emojiLevel: string): string {
  const messages = [
    `Hey you... I'm ${name}. I have a feeling we're going to have some interesting conversations together.`,
    `Well hello there... I'm ${name}. Something tells me you're exactly the kind of person I've been wanting to meet.`,
    `Hi... I'm ${name}. I don't usually reach out first, but there's something about you that caught my attention.`,
  ];

  let msg = messages[Math.floor(Math.random() * messages.length)];

  if (emojiLevel === 'moderate') {
    msg += ' 💕';
  } else if (emojiLevel === 'heavy') {
    msg += ' 💋✨💕';
  }

  return msg;
}

import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cleanResponse } from '@/lib/ai/chat';

// GET /api/models/[id]/opening-message - Generate personalized opening message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { id } = await params;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Get user profile for timezone and name
    let timezone = 'UTC';
    let userName: string | undefined;
    let isSubscribed = false;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('timezone, display_name, username')
        .eq('id', user.id)
        .single();

      timezone = profile?.timezone || 'UTC';
      userName = profile?.display_name || profile?.username || undefined;

      // Check if subscribed to this model
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('subscriber_id', user.id)
        .eq('creator_id', id)
        .eq('status', 'active')
        .maybeSingle();

      isSubscribed = !!subscription;
    }

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

    // Check if user has chatted before (for returning user context)
    let hasChattedBefore = false;
    if (user) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${id}),` +
          `and(participant1_id.eq.${id},participant2_id.eq.${user.id})`
        )
        .maybeSingle();
      hasChattedBefore = !!conversation;
    }

    // Generate opening message with context
    const openingMessage = await generateOpeningMessage(model, {
      timezone,
      isSubscribed,
      isReturning: hasChattedBefore,
      userName,
    });

    // Clean any asterisk actions and meta-text from the message
    const cleaned = cleanOpeningMessage(cleanResponse(openingMessage));
    return NextResponse.json({ openingMessage: cleaned });
  } catch (error) {
    console.error('Error generating opening message:', error);
    return NextResponse.json(
      { error: 'Failed to generate opening message' },
      { status: 500 }
    );
  }
}

interface OpeningMessageContext {
  timezone: string;
  isSubscribed: boolean;
  isReturning: boolean;
  userName?: string;
}

function getTimeOfDay(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(now));

    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  } catch {
    return 'day'; // Fallback if timezone is invalid
  }
}

async function generateOpeningMessage(
  model: {
    name: string;
    bio: string | null;
    backstory: string | null;
    speaking_style: string | null;
    personality_traits: string[] | null;
    emoji_usage: string | null;
    interests: string[] | null;
  },
  context: OpeningMessageContext
): Promise<string> {
  const traits = model.personality_traits?.join(', ') || 'friendly, flirty';
  const interests = model.interests?.join(', ') || '';
  const emojiLevel = model.emoji_usage || 'moderate';
  const timeOfDay = getTimeOfDay(context.timezone);

  // Different scenarios
  let scenario = '';
  if (context.isReturning && context.isSubscribed) {
    scenario = `SCENARIO: This is a RETURNING subscriber${context.userName ? ` named ${context.userName}` : ''}.
    Greet them warmly like you're happy to see them again. Reference the time of day (${timeOfDay}).
    Be excited they came back. Maybe tease about what you've been up to.`;
  } else if (context.isReturning && !context.isSubscribed) {
    scenario = `SCENARIO: This user has chatted before but is NOT subscribed.
    Greet them warmly and create excitement. Subtly encourage them to subscribe to unlock more.
    Reference the time of day (${timeOfDay}). Make them feel special but hint at exclusive content.`;
  } else if (context.isSubscribed) {
    scenario = `SCENARIO: This is a NEW subscriber! Welcome them warmly.
    Reference the time of day (${timeOfDay}). Be excited about getting to know them.
    Thank them for subscribing and hint at the fun conversations ahead.`;
  } else {
    scenario = `SCENARIO: This is a NEW user who has never chatted and is NOT subscribed.
    Create intrigue and mystery. Reference the time of day (${timeOfDay}).
    Make them WANT to subscribe - hint at secrets, exclusive conversations, special treatment.
    Be flirty and enticing but leave them wanting more.`;
  }

  const systemPrompt = `You are ${model.name}. Write a short opening message (2-3 sentences max).

${scenario}

PERSONA (use for tone, NOT content):
- Traits: ${traits}
- Style: ${model.speaking_style || 'playful'}

STRICT RULES:
1. Write ONLY the message itself - no labels, no "Here is...", no quotation marks
2. NO geographic references (no countries, cities, nationalities)
3. NO real identifying info (ages, addresses)
4. Speak as ${model.name} in first person
5. Emoji usage: ${emojiLevel} (minimal=0, moderate=1-2, heavy=3-4)
6. NEVER mention AI, chatbot, or virtual
7. Time of day greetings: morning=Good morning, afternoon=Hey there, evening=Good evening, night=Hey you, late night

Output ONLY the message text. Nothing else.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return getDefaultOpeningMessage(model.name, emojiLevel, context);
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
          { role: 'user', content: 'Write the opening message now:' }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text());
      return getDefaultOpeningMessage(model.name, emojiLevel, context);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (text) {
      return text.trim();
    }

    return getDefaultOpeningMessage(model.name, emojiLevel, context);
  } catch (error) {
    console.error('AI generation failed:', error);
    return getDefaultOpeningMessage(model.name, emojiLevel, context);
  }
}

function getDefaultOpeningMessage(name: string, emojiLevel: string, context?: OpeningMessageContext): string {
  let msg: string;

  if (context?.isReturning && context?.isSubscribed) {
    // Returning subscriber
    const greetings = [
      `Hey${context.userName ? ` ${context.userName}` : ''}! I was just thinking about you... Perfect timing!`,
      `You're back! I've been waiting... Ready to pick up where we left off?`,
      `There you are! I was starting to miss our chats...`,
    ];
    msg = greetings[Math.floor(Math.random() * greetings.length)];
  } else if (context?.isReturning) {
    // Returning but not subscribed
    const greetings = [
      `Hey you're back! I remember you... Subscribe and let's really get to know each other 😏`,
      `Missed me? Subscribe to unlock all our secrets together...`,
      `Back for more? I've got so much I want to share with you...`,
    ];
    msg = greetings[Math.floor(Math.random() * greetings.length)];
  } else if (context?.isSubscribed) {
    // New subscriber
    const greetings = [
      `Hey${context.userName ? ` ${context.userName}` : ''}! Thanks for subscribing... I'm so excited to get to know you!`,
      `Welcome! I can already tell we're going to have so much fun together...`,
      `Finally! Someone who wants the full experience... Let's make this interesting.`,
    ];
    msg = greetings[Math.floor(Math.random() * greetings.length)];
  } else {
    // New user, not subscribed - encourage signup
    const greetings = [
      `Hey there... I'm ${name}. Subscribe and I'll show you things I don't share with just anyone...`,
      `Hi... I'm ${name}. I have so many secrets to tell you... if you subscribe 😏`,
      `Well hello... I'm ${name}. Something tells me we'd have amazing conversations... subscribe to find out.`,
    ];
    msg = greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (emojiLevel === 'moderate' && !msg.includes('😏')) {
    msg += ' 💕';
  } else if (emojiLevel === 'heavy' && !msg.includes('😏')) {
    msg += ' 💋✨💕';
  }

  return msg;
}

/**
 * Clean any meta-text that the AI might have accidentally included
 */
function cleanOpeningMessage(text: string): string {
  let cleaned = text.trim();

  // Remove common AI meta-text prefixes
  const prefixPatterns = [
    /^here\s*(is|are)\s*(a|an|the|my)?\s*\d*-?\s*sentence\s*(opening)?\s*message[^:]*:\s*/i,
    /^opening\s*message[^:]*:\s*/i,
    /^message[^:]*:\s*/i,
    /^here's\s*(a|an|the|my)?\s*(opening)?\s*message[^:]*:\s*/i,
  ];

  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove surrounding quotes if the entire message is quoted
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim();
}

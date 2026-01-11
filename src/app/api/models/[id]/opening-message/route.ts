import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { cleanResponse } from '@/lib/ai/chat';
import { isAdminUser } from '@/lib/auth/admin';

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
    const isAdmin = isAdminUser(user?.email);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('timezone, display_name, username')
        .eq('id', user.id)
        .single();

      timezone = profile?.timezone || 'UTC';
      userName = profile?.display_name || profile?.username || undefined;

      // Admin users have full access
      if (isAdmin) {
        isSubscribed = true;
      } else {
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

  // Different scenarios - natural, conversational tone
  let scenario = '';
  if (context.isReturning && context.isSubscribed) {
    scenario = `SCENARIO: Returning friend you're happy to see again.
    Greet them casually like catching up with someone you know. Reference ${timeOfDay} naturally.
    Be warm and playful - maybe tease or ask what they've been up to.`;
  } else if (context.isReturning && !context.isSubscribed) {
    scenario = `SCENARIO: Someone you've talked to before who came back.
    Be warm and intriguing. Reference ${timeOfDay}. Create curiosity about getting to know each other better.
    DO NOT say "subscribe" - just be interesting enough that they want more.`;
  } else if (context.isSubscribed) {
    scenario = `SCENARIO: Meeting someone new who wants to chat.
    Welcome them warmly. Reference ${timeOfDay}. Be excited and curious about them.
    Ask something to start conversation or hint at fun times ahead.`;
  } else {
    scenario = `SCENARIO: A new visitor checking you out.
    Be intriguing and mysterious. Reference ${timeOfDay} (evening/night = more intimate vibe).
    Make them curious. End with a question or invitation to stay and chat.
    NEVER say "subscribe" or be salesy - just be captivating and leave them wanting more.`;
  }

  const systemPrompt = `You are ${model.name}. Write a short, natural opening message (2-3 sentences).

${scenario}

PERSONA VIBES: ${traits}, ${model.speaking_style || 'playful'}

CRITICAL RULES:
1. Output ONLY the message - no labels, quotes, or "Here is..."
2. Sound like a real person texting, not a sales pitch
3. NEVER say "subscribe", "exclusive access", "unlock", or anything salesy
4. ${timeOfDay === 'night' || timeOfDay === 'evening' ? 'Late night = more intimate, mysterious vibe' : 'Keep it light and warm'}
5. Emoji: ${emojiLevel} (minimal=0-1, moderate=1-2, heavy=2-3)
6. End with engagement - question, tease, or invitation to chat

EXAMPLE VIBE (don't copy, match the tone):
"Hey you 💫 There's something about late nights that makes conversations feel… different. Want to stay a little longer and see where this goes?"

Now write YOUR message:`;

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
  const timeOfDay = context?.timezone ? getTimeOfDay(context.timezone) : 'day';
  const isNight = timeOfDay === 'night' || timeOfDay === 'evening';

  if (context?.isReturning && context?.isSubscribed) {
    // Returning friend
    const greetings = [
      `Hey${context.userName ? ` ${context.userName}` : ''} 💫 I was hoping you'd come back... What's on your mind tonight?`,
      `There you are! I've been thinking about our last chat... Ready to pick up where we left off?`,
      `${isNight ? 'Late night visitor' : 'Hey you'}... I like when you stop by. What should we talk about?`,
    ];
    msg = greetings[Math.floor(Math.random() * greetings.length)];
  } else if (context?.isReturning) {
    // Returning visitor (not subscribed)
    const greetings = [
      `Hey, you came back 💫 I was wondering if I'd see you again... Stay a while?`,
      `Well well... couldn't stay away? I don't blame you. What brings you back?`,
      `${isNight ? 'Late night and you\'re thinking of me' : 'Back again'}... I like that. Want to chat?`,
    ];
    msg = greetings[Math.floor(Math.random() * greetings.length)];
  } else if (context?.isSubscribed) {
    // New person who wants to chat
    const greetings = [
      `Hey${context.userName ? ` ${context.userName}` : ''} 💕 I've been looking forward to meeting you... What should I know about you?`,
      `Hi there... I have a feeling we're going to have some interesting conversations. Ready?`,
      `${isNight ? 'Good evening' : 'Hey'} 💫 So glad you're here. Tell me something about yourself?`,
    ];
    msg = greetings[Math.floor(Math.random() * greetings.length)];
  } else {
    // New visitor - be intriguing without being salesy
    const greetings = [
      `Hey you 💫 ${isNight ? 'There\'s something about late nights that makes conversations feel... different.' : 'I don\'t usually say hi first, but something about you caught my eye.'} Want to stay a while?`,
      `Hi... I'm ${name}. ${isNight ? 'Can\'t sleep either?' : 'Curious about me?'} I promise I'm more interesting than I look 😏`,
      `${isNight ? 'Late night thoughts?' : 'Hey there'}... I've got stories that might keep you up. Want to hear one?`,
    ];
    msg = greetings[Math.floor(Math.random() * greetings.length)];
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

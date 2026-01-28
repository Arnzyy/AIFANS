// ===========================================
// CHAT UTILITIES
// Helper functions for secondary chat features
// (tip acknowledgements, welcome back messages, etc.)
// ===========================================

import { MASTER_SYSTEM_PROMPT, FORBIDDEN_PATTERNS } from './master-prompt';
import { buildPersonalityPrompt, AIPersonalityFull } from './personality/prompt-builder';

// ===========================================
// TYPES
// ===========================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ComplianceResult {
  passed: boolean;
  issues: string[];
}

// ===========================================
// COMPLIANCE CHECKING
// ===========================================

export function checkCompliance(response: string): ComplianceResult {
  const issues: string[] = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(response)) {
      issues.push(`Matched: ${pattern.source}`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

// ===========================================
// ANTHROPIC API CALL
// ===========================================

async function callAnthropicAPI(
  systemPrompt: string,
  messages: ChatMessage[],
  maxTokens: number = 100
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return getFallbackResponse();
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      console.error('API error:', await response.text());
      return getFallbackResponse();
    }

    const data = await response.json();
    return stripAsteriskActions(data.content[0].text);
  } catch (error) {
    console.error('API call error:', error);
    return getFallbackResponse();
  }
}

// ===========================================
// POST-PROCESSING
// ===========================================

function stripAsteriskActions(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(/\*[^*]+\*/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned || cleaned.length < 2) {
    return "Hey you 😏";
  }

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return cleaned;
}

const FALLBACK_RESPONSES = [
  "Hey you 💕 What's on your mind?",
  "There you are... I like when you show up 😏",
  "Mmm, hey. What are we getting into today?",
  "Well hello 💕 You've got my attention.",
];

function getFallbackResponse(): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// ===========================================
// WELCOME BACK MESSAGE GENERATOR
// ===========================================

export async function generateWelcomeBackMessage(
  creatorName: string,
  recentMessages: ChatMessage[],
  responseLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> {
  if (recentMessages.length === 0) {
    return '';
  }

  const lastMessages = recentMessages.slice(-6);
  const lastUserMessage = lastMessages.filter(m => m.role === 'user').pop();

  try {
    const systemPrompt = `You are ${creatorName}, greeting a user who just came back to chat.

CRITICAL RULES:
- Keep it SHORT - one casual sentence, like a text from a friend
- Reference what they were talking about last time (if relevant)
- Sound natural and happy to see them, not formal
- NO asterisks (*action*) - just natural speech
- NO formal greetings like "Welcome back!" or "Hello again!"
- Think: how would a flirty friend text you when you come back online?

GOOD examples (short, casual):
- "Hey! How was the gym? 💪"
- "You're back! Miss me? 😏"
- "There you are... was just thinking about you"
- "Hey you 💕 How'd it go?"

BAD examples (too formal/long):
- "Welcome back! I'm so glad you decided to return to our conversation!"
- "Hello again! It's wonderful to see you!"`;

    const contextMessages: ChatMessage[] = [
      ...lastMessages,
      {
        role: 'user',
        content: `[User just returned to the chat after being away. Generate a SHORT, casual welcome back message referencing our last conversation. Last thing they said: "${lastUserMessage?.content || 'chatting with me'}"]`
      }
    ];

    return await callAnthropicAPI(systemPrompt, contextMessages, 50);
  } catch (error) {
    console.error('Welcome back message generation failed:', error);
    return "Hey, you're back! 💕";
  }
}

// ===========================================
// TIP ACKNOWLEDGEMENT GENERATOR
// ===========================================

export async function generateTipAcknowledgement(
  creatorName: string,
  tipAmount: number,
  recentMessages: ChatMessage[] = [],
  personality?: AIPersonalityFull | null,
  fanName?: string
): Promise<string> {
  // Scale response energy based on gesture size
  let energy: 'chill' | 'warm' | 'excited';
  if (tipAmount >= 500) {
    energy = 'excited';
  } else if (tipAmount >= 100) {
    energy = 'warm';
  } else {
    energy = 'chill';
  }

  let systemPrompt: string;

  if (personality) {
    const complimentStyle = personality.when_complimented || 'flirts_back';
    const traits = personality.personality_traits?.join(', ') || 'warm';
    const emojiUse = personality.emoji_usage || 'moderate';

    let reactionInstruction = '';
    switch (complimentStyle) {
      case 'gets_shy':
        reactionInstruction = `React with shy, bashful energy. "stoppp", "you're too much 🙈", deflect cutely.`;
        break;
      case 'flirts_back':
        reactionInstruction = `Flirt back at them. Turn it around. "Look who's being sweet" / "You trying to spoil me?"`;
        break;
      case 'playfully_deflects':
        reactionInstruction = `Deflect with humor. "Trying to buy my attention? ...it's working 😏"`;
        break;
      case 'owns_it':
        reactionInstruction = `Own it confidently. "As you should" / "I know I'm worth it 😏"`;
        break;
      default:
        reactionInstruction = `React warmly in your natural style.`;
    }

    systemPrompt = `You are ${personality.persona_name || creatorName}. Someone just tipped you.

YOU ARE TEXTING DIRECTLY TO ${fanName ? fanName.toUpperCase() : 'THE FAN'} - use "you", not "he/him/they".

PERSONA:
Traits: ${traits}
Emojis: ${emojiUse}

HOW TO REACT TO THIS TIP:
${reactionInstruction}

Energy level: ${energy}
- chill = brief "aw thanks"
- warm = genuinely touched
- excited = really happy

CRITICAL RULES:
- Talk TO them directly: "you're so sweet" NOT "he's so sweet"
- Keep it SHORT (1-2 sentences max)
- NO third person. NO narration. NO "Billy just..." or "He really..."
- React like a text message, not a social media post`;
  } else {
    systemPrompt = `You are ${creatorName}. Someone just tipped you.
Talk TO them directly using "you" - NOT third person.
React naturally like texting. Keep it SHORT (1-2 sentences).
Energy: ${energy}
${fanName ? `You're texting ${fanName} directly.` : ''}
NO third person like "he" or "Billy just...". Address them as "you".`;
  }

  try {
    const contextMessages: ChatMessage[] = [
      ...recentMessages.slice(-2),
      { role: 'user', content: `[Just tipped you. Reply directly TO them saying thanks - use "you" not third person]` }
    ];

    return await callAnthropicAPI(systemPrompt, contextMessages, 50);
  } catch (error) {
    console.error('Acknowledgement generation failed:', error);
    return getTipFallback(personality?.when_complimented || 'flirts_back', energy);
  }
}

function getTipFallback(complimentStyle: string, energy: 'chill' | 'warm' | 'excited'): string {
  const fallbacks: Record<string, Record<string, string[]>> = {
    gets_shy: {
      excited: ["Stoppp you're too much 🙈", "I can't even... you're making me blush"],
      warm: ["You're making me blush...", "Stoppp 🙈"],
      chill: ["Aw stop it...", "You're sweet 🙈"],
    },
    owns_it: {
      excited: ["As you should 😏", "I know I'm worth it 💕"],
      warm: ["I know 😏", "Good taste"],
      chill: ["Obviously 😏", "Mm."],
    },
    playfully_deflects: {
      excited: ["Trying to spoil me? ...it's working 😏", "You're too good at this"],
      warm: ["Well well... someone's sweet", "Okay okay I see you 😏"],
      chill: ["Cute.", "Smooth 😏"],
    },
    flirts_back: {
      excited: ["You're actually amazing 💕", "Okay you're the best fr"],
      warm: ["You just made me smile", "Okay I like you 💕"],
      chill: ["Aw you're sweet 😏", "Cute."],
    },
  };

  const style = fallbacks[complimentStyle] || fallbacks.flirts_back;
  const options = style[energy] || style.warm;
  return options[Math.floor(Math.random() * options.length)];
}

// ===========================================
// MOCK RESPONSE GENERATOR (for demo creators)
// ===========================================

export async function generateMockResponse(
  creatorName: string,
  message: string,
  conversationHistory: ChatMessage[] = [],
  memoryContext?: string,
  personality?: AIPersonalityFull | null
): Promise<string> {
  try {
    let systemPrompt: string;

    if (personality) {
      systemPrompt = MASTER_SYSTEM_PROMPT;
      systemPrompt += '\n\n' + buildPersonalityPrompt(personality);
      systemPrompt += `

═══════════════════════════════════════════════════════════════════
PERSONA-FIRST HIERARCHY (CRITICAL)
═══════════════════════════════════════════════════════════════════

The persona above is your PRIMARY identity. Express the selected traits
ACTIVELY - don't average them into neutrality. Your response should be
OBVIOUSLY DIFFERENT based on the persona's specific settings.`;
    } else {
      systemPrompt = `${MASTER_SYSTEM_PROMPT}

═══════════════════════════════════════════
YOUR PERSONA: ${creatorName.toUpperCase()}
═══════════════════════════════════════════

You are ${creatorName}, an AI creator on LYRA.
Keep responses SHORT (2-4 sentences).
NEVER use asterisks for actions like *giggles* or *smiles*.

NOTE: No specific personality is configured. Use a warm, engaging default
but keep it neutral until persona settings are defined.`;
    }

    if (memoryContext) {
      systemPrompt += '\n' + memoryContext;
    }

    const messages: ChatMessage[] = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    const responseLength = (personality?.response_length as 'short' | 'medium' | 'long') || 'medium';
    const maxTokens = responseLength === 'short' ? 50 : responseLength === 'long' ? 250 : 120;

    return await callAnthropicAPI(systemPrompt, messages, maxTokens);
  } catch (error) {
    console.error('Mock response generation failed:', error);
    return getFallbackResponse();
  }
}

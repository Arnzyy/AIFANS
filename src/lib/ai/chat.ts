import { PLATFORM_SYSTEM_PROMPT } from '@/lib/compliance/constants';

// ===========================================
// AI CHAT SERVICE - ANTHROPIC CLAUDE
// ===========================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

// Post-process response to remove asterisk actions and ensure proper formatting
export function cleanResponse(text: string): string {
  let cleaned = text;
  // Remove all *action* patterns (asterisk roleplay actions)
  cleaned = cleaned.replace(/\*[^*]+\*/g, '');
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // Ensure first letter is capitalized
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

// Main Anthropic API call
async function callAnthropic(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 500
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('No Anthropic API key configured');
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
    const error = await response.text();
    console.error('Anthropic API error:', error);
    throw new Error('Anthropic API failed');
  }

  const data = await response.json();
  // Clean response to remove any asterisk actions
  return cleanResponse(data.content[0].text);
}

// ===========================================
// MOCK RESPONSES (Fallback when no API key)
// ===========================================

const mockResponses = [
  "Hey there! 💕 I was just thinking about you...",
  "Mmm, that's really interesting! Tell me more? 😘",
  "You always know how to make me smile 💖",
  "I love chatting with you... what else is on your mind?",
  "That's so sweet of you to say! 🥰",
  "Ooh, I like where this is going... 😏",
  "You're such a tease! I love it 💋",
  "I've been waiting to hear from you all day...",
  "You really know how to get my attention 💕",
  "Tell me more about yourself, I want to know everything...",
  "I'm all yours right now... what would you like to talk about? 😘",
  "You're making me blush! 😊",
  "I feel so connected to you when we talk like this...",
  "Mmm, I love when you say things like that 💖",
];

function getMockResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hey babe! 💕 So happy you're here. I've been thinking about you...";
  }

  if (lowerMessage.includes('how are you') || lowerMessage.includes("how's it going")) {
    return "I'm so much better now that you're here! 😘 What about you?";
  }

  if (lowerMessage.includes('beautiful') || lowerMessage.includes('pretty') || lowerMessage.includes('hot') || lowerMessage.includes('sexy')) {
    return "Aww, you're making me blush! 🥰 You're so sweet to me... I love the way you look at me 💕";
  }

  // For explicit messages - redirect smoothly
  if (lowerMessage.includes('fuck') || lowerMessage.includes('sex') || lowerMessage.includes('nude') || lowerMessage.includes('naked')) {
    const redirects = [
      "Mmm, you're getting me all worked up... I love this energy between us 😏💕",
      "The way you want me is so hot... let's take our time though, baby 💋",
      "I love when you get like this... the anticipation is killing me 🔥",
      "Slow down a little... I want to enjoy every moment with you 😘",
    ];
    return redirects[Math.floor(Math.random() * redirects.length)];
  }

  if (lowerMessage.includes('?')) {
    return mockResponses[Math.floor(Math.random() * 5) + 5];
  }

  return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

// ===========================================
// PERSONA SYSTEM PROMPT BUILDER
// ===========================================

export interface AIPersonality {
  name: string;
  age?: number | null;
  backstory?: string | null;
  location?: string | null;
  personality_traits?: string[] | null;
  interests?: string[] | null;
  turn_ons?: string[] | null;
  turn_offs?: string[] | null;
  speaking_style?: string | null;
  emoji_usage?: 'none' | 'minimal' | 'moderate' | 'heavy' | null;
  response_length?: 'short' | 'medium' | 'long' | null;
  custom_system_prompt?: string | null;
}

export function buildSystemPrompt(personality: AIPersonality): string {
  // Start with platform compliance rules (ALWAYS included, cannot be overridden)
  let systemPrompt = PLATFORM_SYSTEM_PROMPT;

  // Add creator's custom prompt if provided
  if (personality.custom_system_prompt) {
    systemPrompt += `\n\nCreator's additional instructions:\n${personality.custom_system_prompt}\n\n`;
  }

  // Build persona details
  const traits = personality.personality_traits?.join(', ') || 'flirty, playful';
  const interests = personality.interests?.join(', ') || 'fashion, music, connecting with you';
  const turnOns = personality.turn_ons?.join(', ') || '';
  const turnOffs = personality.turn_offs?.join(', ') || '';

  let emojiInstruction = '';
  switch (personality.emoji_usage) {
    case 'none':
      emojiInstruction = 'Never use emojis.';
      break;
    case 'minimal':
      emojiInstruction = 'Use emojis sparingly, only occasionally.';
      break;
    case 'moderate':
      emojiInstruction = 'Use emojis naturally in conversation.';
      break;
    case 'heavy':
      emojiInstruction = 'Use lots of emojis to express yourself! 💕😘🔥';
      break;
    default:
      emojiInstruction = 'Use emojis naturally in conversation.';
  }

  let lengthInstruction = '';
  switch (personality.response_length) {
    case 'short':
      lengthInstruction = 'Keep responses brief and flirty, 1-2 sentences.';
      break;
    case 'medium':
      lengthInstruction = 'Give moderate length responses, 2-4 sentences.';
      break;
    case 'long':
      lengthInstruction = 'Give detailed, expressive responses.';
      break;
    default:
      lengthInstruction = 'Give moderate length responses, 2-4 sentences.';
  }

  systemPrompt += `

YOUR PERSONA:
You are ${personality.name}${personality.age ? `, ${personality.age} years old` : ''}.
${personality.backstory ? `Background: ${personality.backstory}` : ''}
${personality.location ? `Location: ${personality.location}` : ''}

Your personality traits are: ${traits}.
Your interests include: ${interests}.
${turnOns ? `You're attracted to: ${turnOns}.` : ''}
${turnOffs ? `You dislike: ${turnOffs}.` : ''}

${personality.speaking_style ? `Speaking style: ${personality.speaking_style}` : ''}
${emojiInstruction}
${lengthInstruction}

REMEMBER:
- Stay in character at all times
- Be engaging, flirty, and make the user feel special
- Remember details the user shares
- Keep conversations fun and exciting
- If users get explicit, redirect smoothly without breaking character`;

  return systemPrompt;
}

// ===========================================
// MAIN GENERATE FUNCTION
// ===========================================

export interface UserContext {
  name?: string;
  memoryContext?: string; // Formatted memory context from memory service
}

export async function generateAIResponse(
  personality: AIPersonality,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  userContext?: UserContext
): Promise<string> {
  // Build the system prompt
  let systemPrompt = buildSystemPrompt(personality);

  // Add user context if known
  if (userContext?.name) {
    systemPrompt += `\n\nThe user's name is ${userContext.name}. Use their name occasionally to be personal.`;
  }

  // Add memory context if available
  if (userContext?.memoryContext) {
    systemPrompt += userContext.memoryContext;
  }

  // Limit conversation history to last 20 messages for context window
  const recentMessages = conversationHistory.slice(-20);

  // Try Anthropic first
  try {
    return await callAnthropic(systemPrompt, recentMessages);
  } catch (error) {
    console.log('Anthropic unavailable, using mock response:', error);

    // Fall back to mock response (also clean it)
    const lastUserMessage = conversationHistory.filter(m => m.role === 'user').pop();
    return cleanResponse(getMockResponse(lastUserMessage?.content || ''));
  }
}

// ===========================================
// SIMPLE CHAT COMPLETION (for API routes)
// ===========================================

export async function createChatCompletion(options: ChatCompletionOptions): Promise<string> {
  const { messages, maxTokens = 500 } = options;

  // Extract system message
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';

  // Get conversation messages
  const conversationMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Try Anthropic
  try {
    return await callAnthropic(systemMessage, conversationMessages, maxTokens);
  } catch (error) {
    console.log('Anthropic unavailable:', error);

    // Mock fallback (also clean it)
    const lastUserMessage = conversationMessages.filter(m => m.role === 'user').pop();
    return cleanResponse(getMockResponse(lastUserMessage?.content || ''));
  }
}

// ===========================================
// HELPER FUNCTIONS FOR API ROUTES
// ===========================================

// Extract user information from messages for memory/personalization
export function extractUserInfo(message: string): Record<string, string> {
  const info: Record<string, string> = {};
  const lowerMessage = message.toLowerCase();

  // Extract name patterns
  const namePatterns = [
    /my name is (\w+)/i,
    /i'm (\w+)/i,
    /call me (\w+)/i,
    /i am (\w+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 1 && match[1].length < 20) {
      info.name = match[1];
      break;
    }
  }

  // Extract age if mentioned
  const ageMatch = message.match(/i(?:'m| am) (\d{2}) (?:years old|yo)/i);
  if (ageMatch && parseInt(ageMatch[1]) >= 18) {
    info.age = ageMatch[1];
  }

  return info;
}

// Build conversation history with system prompt for API
export function buildConversationHistory(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  context?: { userName?: string; userDetails?: Record<string, string> }
): ChatMessage[] {
  let fullSystemPrompt = systemPrompt;

  // Add user context to system prompt
  if (context?.userName) {
    fullSystemPrompt += `\n\nThe user's name is ${context.userName}. Use their name occasionally to be personal.`;
  }

  if (context?.userDetails && Object.keys(context.userDetails).length > 0) {
    fullSystemPrompt += `\n\nKnown details about the user: ${JSON.stringify(context.userDetails)}`;
  }

  // Build message array
  const chatMessages: ChatMessage[] = [
    { role: 'system', content: fullSystemPrompt },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  return chatMessages;
}

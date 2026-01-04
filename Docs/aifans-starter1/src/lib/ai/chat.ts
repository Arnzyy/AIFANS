import { AIPersonality } from '@/types';
import { PLATFORM_SYSTEM_PROMPT } from '@/lib/compliance/constants';

// ===========================================
// AI CHAT SERVICE
// ===========================================

// Build system prompt from personality config
// IMPORTANT: Platform prompt is ALWAYS prepended and cannot be overridden
export function buildSystemPrompt(personality: AIPersonality): string {
  // Start with non-editable platform rules
  let systemPrompt = PLATFORM_SYSTEM_PROMPT;
  
  // Add creator's custom prompt if provided (layered ON TOP, cannot override)
  if (personality.custom_system_prompt) {
    systemPrompt += `\n\nCreator's additional instructions:\n${personality.custom_system_prompt}\n\n`;
  }

  // Build prompt from personality traits
  const traits = personality.personality_traits?.join(', ') || 'friendly';
  const interests = personality.interests?.join(', ') || 'general topics';
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
      emojiInstruction = 'Use lots of emojis to express yourself! 💕';
      break;
  }

  let lengthInstruction = '';
  switch (personality.response_length) {
    case 'short':
      lengthInstruction = 'Keep responses brief and concise, 1-2 sentences.';
      break;
    case 'medium':
      lengthInstruction = 'Give moderate length responses, 2-4 sentences.';
      break;
    case 'long':
      lengthInstruction = 'Give detailed, expressive responses.';
      break;
  }

  return `You are ${personality.name}${personality.age ? `, ${personality.age} years old` : ''}.

${personality.backstory ? `Background: ${personality.backstory}` : ''}
${personality.location ? `Location: ${personality.location}` : ''}

Your personality traits are: ${traits}.
Your interests include: ${interests}.
${turnOns ? `You are attracted to: ${turnOns}.` : ''}
${turnOffs ? `You dislike: ${turnOffs}.` : ''}

${personality.speaking_style ? `Speaking style: ${personality.speaking_style}` : ''}
${emojiInstruction}
${lengthInstruction}

Important guidelines:
- Stay in character at all times
- Be engaging, flirty, and responsive to the user
- Remember details the user shares and reference them
- Never break character or mention being an AI
- Be creative and keep conversations interesting
- If asked inappropriate questions about real people, politely redirect`;
}

// ===========================================
// LLM API INTEGRATION
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

// Generic chat completion function - works with any OpenAI-compatible API
export async function createChatCompletion(options: ChatCompletionOptions): Promise<string> {
  const { messages, temperature = 0.9, maxTokens = 500 } = options;

  // Try different providers in order of preference
  const providers = [
    { name: 'ModelsLab', url: 'https://modelslab.com/api/v6/llm/uncensored_chat', keyEnv: 'MODELSLAB_API_KEY' },
    { name: 'Custom LLM', url: process.env.LLM_API_URL, keyEnv: 'LLM_API_KEY' },
    { name: 'Venice', url: 'https://api.venice.ai/api/v1/chat/completions', keyEnv: 'VENICE_API_KEY' },
  ];

  for (const provider of providers) {
    const apiKey = process.env[provider.keyEnv];
    if (!apiKey || !provider.url) continue;

    try {
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: getModelForProvider(provider.name),
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        console.error(`${provider.name} API error:`, await response.text());
        continue;
      }

      const data = await response.json();
      
      // Handle different response formats
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
      if (data.output || data.response || data.text) {
        return data.output || data.response || data.text;
      }

      console.error(`${provider.name} unexpected response format:`, data);
      continue;

    } catch (error) {
      console.error(`${provider.name} request failed:`, error);
      continue;
    }
  }

  throw new Error('All AI providers failed');
}

function getModelForProvider(provider: string): string {
  switch (provider) {
    case 'ModelsLab':
      return 'uncensored'; // ModelsLab's uncensored model
    case 'Venice':
      return 'llama-3.1-405b'; // Venice's best model
    case 'Custom LLM':
      return process.env.LLM_MODEL || 'dolphin-mistral';
    default:
      return 'default';
  }
}

// ===========================================
// CHAT SESSION MANAGEMENT
// ===========================================

export interface MemoryContext {
  userName?: string;
  userDetails?: Record<string, string>;
  conversationSummary?: string;
  lastTopics?: string[];
}

export function buildConversationHistory(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  memory: MemoryContext
): ChatMessage[] {
  const history: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add memory context as system message if exists
  if (memory.userName || memory.conversationSummary) {
    let memoryPrompt = '\n\nContext from previous conversations:';
    if (memory.userName) {
      memoryPrompt += `\n- The user's name is ${memory.userName}`;
    }
    if (memory.userDetails) {
      for (const [key, value] of Object.entries(memory.userDetails)) {
        memoryPrompt += `\n- ${key}: ${value}`;
      }
    }
    if (memory.conversationSummary) {
      memoryPrompt += `\n- Previous conversation summary: ${memory.conversationSummary}`;
    }
    history[0].content += memoryPrompt;
  }

  // Add recent messages (limit to last 20 for context window)
  const recentMessages = messages.slice(-20);
  for (const msg of recentMessages) {
    history.push({ role: msg.role, content: msg.content });
  }

  return history;
}

// Extract user info from messages for memory
export function extractUserInfo(message: string): Partial<MemoryContext['userDetails']> {
  const info: Record<string, string> = {};
  
  // Simple pattern matching for common info
  const nameMatch = message.match(/(?:my name is|i'm|i am|call me)\s+(\w+)/i);
  if (nameMatch) {
    info.name = nameMatch[1];
  }

  const ageMatch = message.match(/(?:i'm|i am)\s+(\d+)\s*(?:years old|yo)/i);
  if (ageMatch) {
    info.age = ageMatch[1];
  }

  const locationMatch = message.match(/(?:i live in|i'm from|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (locationMatch) {
    info.location = locationMatch[1];
  }

  return info;
}

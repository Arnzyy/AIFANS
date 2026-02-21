// ===========================================
// VOICE WEBSOCKET SERVER
// Standalone Node.js server for real-time voice
// Pipeline: Deepgram STT → Claude AI → ElevenLabs TTS
// ===========================================

// Immediate startup log
console.log('[VoiceWS] ========================================');
console.log('[VoiceWS] Voice WebSocket Server Starting...');
console.log('[VoiceWS] Node version:', process.version);
console.log('[VoiceWS] ========================================');

// Global error handlers to catch crashes
process.on('uncaughtException', (error) => {
  console.error('[VoiceWS] UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[VoiceWS] UNHANDLED REJECTION:', reason);
});

import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import { createClient as createDeepgramClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

console.log('[VoiceWS] Imports loaded successfully');

// ===========================================
// TYPES
// ===========================================

interface VoiceTokenPayload {
  sessionId: string;
  userId: string;
  creatorId: string;
  personalityId: string;
  mode: 'call' | 'inline';
  iat: number;
  exp: number;
}

type ClientWSMessage =
  | { type: 'AUDIO_CHUNK'; data: string; timestamp: number }
  | { type: 'BARGE_IN'; timestamp: number }
  | { type: 'VAD_START'; timestamp: number }
  | { type: 'VAD_END'; timestamp: number }
  | { type: 'END_SESSION'; reason: string }
  | { type: 'PING' };

type ServerWSMessage =
  | { type: 'SESSION_READY'; sessionId: string; config: SessionConfig }
  | { type: 'AUDIO_CHUNK'; data: string; sequence: number }
  | { type: 'TRANSCRIPT_USER'; text: string; isFinal: boolean }
  | { type: 'TRANSCRIPT_AI'; text: string; isFinal: boolean }
  | { type: 'AI_SPEAKING_START' }
  | { type: 'AI_SPEAKING_END' }
  | { type: 'BARGE_IN_ACK' }
  | { type: 'ERROR'; message: string; code: string }
  | { type: 'USAGE_UPDATE'; minutesUsed: number; minutesLimit: number }
  | { type: 'SESSION_ENDED'; reason: string; duration: number }
  | { type: 'PONG' };

interface SessionConfig {
  bargeInEnabled: boolean;
  maxSessionMinutes: number;
  silenceTimeoutMs: number;
  vadSensitivity: number;
}

interface ActiveSession {
  ws: WebSocket;
  payload: VoiceTokenPayload;
  startTime: number;
  lastActivity: number;
  isProcessing: boolean;
  // Voice pipeline state
  deepgramConnection: any | null;
  personality: PersonalityData | null;
  voiceSettings: VoiceSettingsData | null;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentUserTranscript: string;
  isAISpeaking: boolean;
  abortController: AbortController | null;
}

interface PersonalityData {
  id: string;
  persona_name: string;
  backstory: string | null;
  personality_traits: string[] | null;
  speaking_style: string | null;
  sample_dialogues: string[] | null;
}

interface VoiceSettingsData {
  voice_id: string;
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}

// ===========================================
// CONFIGURATION
// ===========================================

const PORT = parseInt(process.env.PORT || process.env.VOICE_WS_PORT || '3001', 10);
const JWT_SECRET = process.env.VOICE_JWT_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDIS_URL = process.env.REDIS_URL;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Unique server instance ID for multi-replica coordination
const SERVER_ID = randomUUID();

// Session limits
const MAX_SESSION_MS = 30 * 60 * 1000; // 30 minutes
const PING_INTERVAL_MS = 30 * 1000; // 30 seconds
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const SESSION_LOCK_TTL = 60; // Redis lock TTL in seconds

// ===========================================
// INITIALIZATION
// ===========================================

// Validate required env vars
if (!JWT_SECRET) {
  console.error('[VoiceWS] VOICE_JWT_SECRET not configured');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[VoiceWS] Supabase credentials not configured');
  process.exit(1);
}

if (!DEEPGRAM_API_KEY) {
  console.error('[VoiceWS] DEEPGRAM_API_KEY not configured');
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error('[VoiceWS] ANTHROPIC_API_KEY not configured');
  process.exit(1);
}

if (!ELEVENLABS_API_KEY) {
  console.error('[VoiceWS] ELEVENLABS_API_KEY not configured');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const deepgram = createDeepgramClient(DEEPGRAM_API_KEY);

console.log('[VoiceWS] Deepgram client initialized');

// Initialize Redis (optional - falls back to local-only mode)
let redis: Redis | null = null;
let redisSub: Redis | null = null;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL);
  redisSub = new Redis(REDIS_URL);

  redis.on('connect', () => console.log('[VoiceWS] Redis connected'));
  redis.on('error', (err) => console.error('[VoiceWS] Redis error:', err));

  // Subscribe to cross-server messages
  redisSub.subscribe('voice:commands', (err) => {
    if (err) console.error('[VoiceWS] Redis subscribe error:', err);
  });

  redisSub.on('message', (channel, message) => {
    handleRedisMessage(channel, message);
  });

  console.log('[VoiceWS] Redis enabled - horizontal scaling ready');
} else {
  console.log('[VoiceWS] Redis not configured - single instance mode');
}

// Active sessions map (local to this server instance)
const activeSessions = new Map<string, ActiveSession>();

// ===========================================
// REDIS HELPERS
// ===========================================

async function acquireSessionLock(sessionId: string): Promise<boolean> {
  if (!redis) return true; // No Redis = single instance, always succeed

  const lockKey = `voice:lock:${sessionId}`;
  const result = await redis.set(lockKey, SERVER_ID, 'EX', SESSION_LOCK_TTL, 'NX');
  return result === 'OK';
}

async function releaseSessionLock(sessionId: string): Promise<void> {
  if (!redis) return;

  const lockKey = `voice:lock:${sessionId}`;
  const owner = await redis.get(lockKey);
  if (owner === SERVER_ID) {
    await redis.del(lockKey);
  }
}

async function refreshSessionLock(sessionId: string): Promise<void> {
  if (!redis) return;

  const lockKey = `voice:lock:${sessionId}`;
  await redis.expire(lockKey, SESSION_LOCK_TTL);
}

async function registerActiveSession(sessionId: string, userId: string): Promise<void> {
  if (!redis) return;

  await redis.hset('voice:active', sessionId, JSON.stringify({
    serverId: SERVER_ID,
    userId,
    startTime: Date.now(),
  }));
}

async function unregisterActiveSession(sessionId: string): Promise<void> {
  if (!redis) return;

  await redis.hdel('voice:active', sessionId);
}

async function getActiveSessionCount(): Promise<number> {
  if (!redis) return activeSessions.size;

  return await redis.hlen('voice:active');
}

function handleRedisMessage(channel: string, message: string): void {
  try {
    const data = JSON.parse(message);

    // Ignore messages from self
    if (data.serverId === SERVER_ID) return;

    if (data.type === 'END_SESSION' && activeSessions.has(data.sessionId)) {
      const session = activeSessions.get(data.sessionId);
      if (session) {
        endSession(session, 'remote_termination');
      }
    }
  } catch (error) {
    console.error('[VoiceWS] Redis message error:', error);
  }
}

async function broadcastCommand(type: string, sessionId: string): Promise<void> {
  if (!redis) return;

  await redis.publish('voice:commands', JSON.stringify({
    type,
    sessionId,
    serverId: SERVER_ID,
    timestamp: Date.now(),
  }));
}

// ===========================================
// HTTP + WEBSOCKET SERVER
// ===========================================

// Create HTTP server for Railway proxy compatibility
const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Health check endpoint for Railway
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      server: 'voice-ws',
      activeSessions: activeSessions.size,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // 404 for other routes
  res.writeHead(404);
  res.end('Not found');
});

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({ server: httpServer });

// Start HTTP server
httpServer.listen(PORT, () => {
  console.log(`[VoiceWS] HTTP server listening on port ${PORT}`);
  console.log(`[VoiceWS] WebSocket ready at ws://localhost:${PORT}`);
});

wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
  console.log('[VoiceWS] New connection attempt');

  // Extract token from query string
  const url = new URL(request.url || '', `http://localhost:${PORT}`);
  const token = url.searchParams.get('token');

  if (!token) {
    console.log('[VoiceWS] No token provided');
    sendError(ws, 'Authentication required', 'AUTH_FAILED');
    ws.close(4001, 'Authentication required');
    return;
  }

  // Verify token
  let payload: VoiceTokenPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET!, {
      algorithms: ['HS256'],
    }) as VoiceTokenPayload;
  } catch (error) {
    console.log('[VoiceWS] Invalid token:', error);
    sendError(ws, 'Invalid or expired token', 'AUTH_FAILED');
    ws.close(4001, 'Invalid token');
    return;
  }

  console.log('[VoiceWS] Authenticated:', {
    sessionId: payload.sessionId,
    userId: payload.userId,
    mode: payload.mode,
  });

  // Verify session belongs to user (prevents token reuse attacks)
  const { data: sessionCheck, error: sessionCheckError } = await supabase
    .from('voice_sessions')
    .select('id, user_id, status')
    .eq('id', payload.sessionId)
    .eq('user_id', payload.userId)
    .single();

  if (sessionCheckError || !sessionCheck) {
    console.log('[VoiceWS] Session-user mismatch:', payload.sessionId, payload.userId);
    sendError(ws, 'Invalid session', 'SESSION_INVALID');
    ws.close(4003, 'Session invalid');
    return;
  }

  if (sessionCheck.status === 'ended') {
    console.log('[VoiceWS] Session already ended:', payload.sessionId);
    sendError(ws, 'Session has ended', 'SESSION_ENDED');
    ws.close(4004, 'Session ended');
    return;
  }

  // Try to acquire session lock (prevents concurrent connections across replicas)
  const lockAcquired = await acquireSessionLock(payload.sessionId);
  if (!lockAcquired) {
    console.log('[VoiceWS] Session locked by another server:', payload.sessionId);
    sendError(ws, 'Session already connected', 'CONCURRENT_SESSION');
    ws.close(4002, 'Session already active');
    return;
  }

  // Check for existing local session
  const existingSession = activeSessions.get(payload.sessionId);
  if (existingSession) {
    console.log('[VoiceWS] Session already active locally:', payload.sessionId);
    await releaseSessionLock(payload.sessionId);
    sendError(ws, 'Session already connected', 'CONCURRENT_SESSION');
    ws.close(4002, 'Session already active');
    return;
  }

  // Fetch personality and voice settings
  const [personalityResult, voiceSettingsResult] = await Promise.all([
    fetchPersonality(payload.personalityId),
    fetchVoiceSettings(payload.personalityId),
  ]);

  if (!personalityResult) {
    console.error('[VoiceWS] Personality not found:', payload.personalityId);
    sendError(ws, 'Personality not found', 'PERSONALITY_NOT_FOUND');
    ws.close(4005, 'Personality not found');
    await releaseSessionLock(payload.sessionId);
    return;
  }

  console.log('[VoiceWS] Loaded personality:', personalityResult.persona_name);
  console.log('[VoiceWS] Voice settings:', voiceSettingsResult?.voice_id || 'default');

  // Create session entry
  const session: ActiveSession = {
    ws,
    payload,
    startTime: Date.now(),
    lastActivity: Date.now(),
    isProcessing: false,
    // Voice pipeline state
    deepgramConnection: null,
    personality: personalityResult,
    voiceSettings: voiceSettingsResult,
    conversationHistory: [],
    currentUserTranscript: '',
    isAISpeaking: false,
    abortController: null,
  };

  activeSessions.set(payload.sessionId, session);

  // Register in Redis for cross-server visibility
  await registerActiveSession(payload.sessionId, payload.userId);

  // Update session status in database
  await updateSessionStatus(payload.sessionId, 'active');

  // Initialize Deepgram connection for this session
  await initializeDeepgram(session);

  // Send session ready message
  const config: SessionConfig = {
    bargeInEnabled: true,
    maxSessionMinutes: 30,
    silenceTimeoutMs: 30000,
    vadSensitivity: 0.5,
  };

  sendMessage(ws, {
    type: 'SESSION_READY',
    sessionId: payload.sessionId,
    config,
  });

  // ===========================================
  // MESSAGE HANDLING
  // ===========================================

  ws.on('message', async (data: Buffer) => {
    try {
      const message: ClientWSMessage = JSON.parse(data.toString());
      session.lastActivity = Date.now();

      switch (message.type) {
        case 'AUDIO_CHUNK':
          await handleAudioChunk(session, message.data);
          break;

        case 'BARGE_IN':
          handleBargeIn(session);
          break;

        case 'VAD_START':
          handleVADStart(session);
          break;

        case 'VAD_END':
          handleVADEnd(session);
          break;

        case 'END_SESSION':
          await endSession(session, message.reason);
          break;

        case 'PING':
          sendMessage(ws, { type: 'PONG' });
          break;

        default:
          console.log('[VoiceWS] Unknown message type:', message);
      }
    } catch (error) {
      console.error('[VoiceWS] Message parse error:', error);
    }
  });

  // ===========================================
  // CONNECTION EVENTS
  // ===========================================

  ws.on('close', async (code: number, reason: Buffer) => {
    console.log('[VoiceWS] Connection closed:', {
      sessionId: payload.sessionId,
      code,
      reason: reason.toString(),
    });

    await cleanupSession(session, 'connection_closed');
  });

  ws.on('error', async (error: Error) => {
    console.error('[VoiceWS] Connection error:', error);
    await cleanupSession(session, 'connection_error');
  });

  // ===========================================
  // SESSION TIMER
  // ===========================================

  // Set up session timeout
  const sessionTimer = setTimeout(async () => {
    console.log('[VoiceWS] Session timeout:', payload.sessionId);
    await endSession(session, 'max_duration');
  }, MAX_SESSION_MS);

  // Store timer reference for cleanup
  (session as any).sessionTimer = sessionTimer;
});

// ===========================================
// DATA FETCHING
// ===========================================

async function fetchPersonality(personalityId: string): Promise<PersonalityData | null> {
  try {
    console.log('[VoiceWS] Fetching personality by ID:', personalityId);

    // First try direct lookup by id
    const { data, error } = await supabase
      .from('ai_personalities')
      .select('id, persona_name, backstory, personality_traits, speaking_style, sample_dialogues')
      .eq('id', personalityId)
      .maybeSingle();

    if (error) {
      console.error('[VoiceWS] Fetch personality error:', error.message, error.code, error.details);
    }

    if (data) {
      console.log('[VoiceWS] Found personality:', data.persona_name);
      return data as PersonalityData;
    }

    // Fallback: try lookup by model_id
    console.log('[VoiceWS] Trying fallback lookup by model_id...');
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('ai_personalities')
      .select('id, persona_name, backstory, personality_traits, speaking_style, sample_dialogues')
      .eq('model_id', personalityId)
      .maybeSingle();

    if (fallbackError) {
      console.error('[VoiceWS] Fallback lookup error:', fallbackError.message);
    }

    if (fallbackData) {
      console.log('[VoiceWS] Found personality via model_id:', fallbackData.persona_name);
      return fallbackData as PersonalityData;
    }

    console.error('[VoiceWS] Personality not found by id or model_id:', personalityId);
    return null;
  } catch (error) {
    console.error('[VoiceWS] Fetch personality exception:', error);
    return null;
  }
}

async function fetchVoiceSettings(personalityId: string): Promise<VoiceSettingsData | null> {
  try {
    const { data, error } = await supabase
      .from('model_voice_settings')
      .select('elevenlabs_voice_id, stability, similarity_boost, style, speed')
      .eq('personality_id', personalityId)
      .single();

    if (error || !data) {
      // Return default voice settings
      return {
        voice_id: 'EXAVITQu4vr4xnSDxMaL', // Default ElevenLabs voice (Sarah)
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        speed: 1.0,
      };
    }
    return {
      voice_id: data.elevenlabs_voice_id || 'EXAVITQu4vr4xnSDxMaL',
      stability: data.stability ?? 0.5,
      similarity_boost: data.similarity_boost ?? 0.75,
      style: data.style ?? 0.0,
      speed: data.speed ?? 1.0,
    };
  } catch (error) {
    console.error('[VoiceWS] Fetch voice settings error:', error);
    return null;
  }
}

// ===========================================
// DEEPGRAM INITIALIZATION
// ===========================================

async function initializeDeepgram(session: ActiveSession): Promise<void> {
  try {
    console.log('[VoiceWS] Initializing Deepgram for session:', session.payload.sessionId);

    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en',
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
      interim_results: true,
      utterance_end_ms: 1500,
      vad_events: true,
      smart_format: true,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('[Deepgram] Connection opened for session:', session.payload.sessionId);
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (transcript) {
        const isFinal = data.is_final || false;

        // Accumulate transcript
        if (isFinal) {
          session.currentUserTranscript += (session.currentUserTranscript ? ' ' : '') + transcript;
        }

        // Send to client
        sendMessage(session.ws, {
          type: 'TRANSCRIPT_USER',
          text: isFinal ? session.currentUserTranscript : session.currentUserTranscript + ' ' + transcript,
          isFinal: false,
        });

        console.log('[Deepgram] Transcript:', transcript, '(final:', isFinal, ')');
      }
    });

    connection.on(LiveTranscriptionEvents.UtteranceEnd, async () => {
      console.log('[Deepgram] Utterance end - user finished speaking');

      const userText = session.currentUserTranscript.trim();
      if (userText) {
        // Send final transcript to client
        sendMessage(session.ws, {
          type: 'TRANSCRIPT_USER',
          text: userText,
          isFinal: true,
        });

        // Clear for next utterance
        session.currentUserTranscript = '';

        // Process with Claude
        await processUserMessage(session, userText);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      console.error('[Deepgram] Error:', error);
      sendMessage(session.ws, {
        type: 'ERROR',
        message: 'Speech recognition error',
        code: 'STT_ERROR',
      });
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('[Deepgram] Connection closed for session:', session.payload.sessionId);
    });

    session.deepgramConnection = connection;
    console.log('[VoiceWS] Deepgram initialized successfully');
  } catch (error) {
    console.error('[VoiceWS] Deepgram init error:', error);
    sendMessage(session.ws, {
      type: 'ERROR',
      message: 'Failed to initialize speech recognition',
      code: 'STT_INIT_ERROR',
    });
  }
}

// ===========================================
// CLAUDE STREAMING
// ===========================================

function buildVoicePrompt(personality: PersonalityData): string {
  const traits = personality.personality_traits?.join(', ') || 'friendly, warm';
  const style = personality.speaking_style || 'conversational and natural';

  return `You are ${personality.persona_name}.

${personality.backstory || ''}

PERSONALITY: ${traits}
SPEAKING STYLE: ${style}

${personality.sample_dialogues?.length ? `EXAMPLE CONVERSATIONS:\n${personality.sample_dialogues.join('\n\n')}` : ''}

═══════════════════════════════════════════
VOICE CONVERSATION MODE
═══════════════════════════════════════════

You are in a LIVE VOICE CALL. Your responses will be spoken aloud.

CRITICAL RULES:
- Keep responses SHORT: 1-3 sentences max
- Use natural SPOKEN language
- NO markdown, NO bullet points, NO emojis, NO asterisks
- Sound like a real person on a phone call
- Be warm, engaging, and conversational
- End with questions to keep conversation flowing
- React naturally to what the user says`;
}

async function processUserMessage(session: ActiveSession, userText: string): Promise<void> {
  if (session.isProcessing) {
    console.log('[Claude] Already processing, skipping');
    return;
  }

  session.isProcessing = true;
  session.isAISpeaking = true;
  session.abortController = new AbortController();

  try {
    console.log('[Claude] Processing user message:', userText);
    sendMessage(session.ws, { type: 'AI_SPEAKING_START' });

    // Add user message to history
    session.conversationHistory.push({ role: 'user', content: userText });

    // Keep history manageable (last 10 exchanges)
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }

    const systemPrompt = buildVoicePrompt(session.personality!);

    // Stream from Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: session.conversationHistory,
        stream: true,
      }),
      signal: session.abortController.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Claude] API error:', error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    // Process SSE stream
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullResponse = '';
    let sentenceBuffer = '';
    let audioSequence = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);

          if (event.type === 'content_block_delta' && event.delta?.text) {
            const text = event.delta.text;
            fullResponse += text;
            sentenceBuffer += text;

            // Send transcript update
            sendMessage(session.ws, {
              type: 'TRANSCRIPT_AI',
              text: fullResponse,
              isFinal: false,
            });

            // Check for sentence completion for TTS
            const sentenceEnds = ['.', '!', '?', '...'];
            const lastChar = sentenceBuffer.trim().slice(-1);

            if (sentenceEnds.some(end => sentenceBuffer.includes(end)) && sentenceBuffer.trim().length > 10) {
              // Extract complete sentence
              const sentenceMatch = sentenceBuffer.match(/[^.!?]+[.!?]+/);
              if (sentenceMatch) {
                const sentence = sentenceMatch[0].trim();
                sentenceBuffer = sentenceBuffer.slice(sentenceMatch[0].length);

                // Stream TTS for this sentence
                await streamTTSToClient(session, sentence, audioSequence++);
              }
            }
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    // Send any remaining text to TTS
    if (sentenceBuffer.trim()) {
      await streamTTSToClient(session, sentenceBuffer.trim(), audioSequence++);
    }

    // Send final transcript
    sendMessage(session.ws, {
      type: 'TRANSCRIPT_AI',
      text: fullResponse,
      isFinal: true,
    });

    // Add to conversation history
    session.conversationHistory.push({ role: 'assistant', content: fullResponse });

    console.log('[Claude] Response complete:', fullResponse.length, 'chars');
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[Claude] Request aborted (barge-in)');
    } else {
      console.error('[Claude] Error:', error);
      sendMessage(session.ws, {
        type: 'ERROR',
        message: 'AI response error',
        code: 'AI_ERROR',
      });
    }
  } finally {
    session.isProcessing = false;
    session.isAISpeaking = false;
    session.abortController = null;
    sendMessage(session.ws, { type: 'AI_SPEAKING_END' });
  }
}

// ===========================================
// ELEVENLABS TTS
// ===========================================

async function streamTTSToClient(session: ActiveSession, text: string, sequence: number): Promise<void> {
  if (!session.voiceSettings) return;

  try {
    console.log('[ElevenLabs] Streaming TTS:', text.substring(0, 50) + '...');

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${session.voiceSettings.voice_id}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: session.voiceSettings.stability,
            similarity_boost: session.voiceSettings.similarity_boost,
            style: session.voiceSettings.style,
            use_speaker_boost: true,
          },
        }),
        signal: session.abortController?.signal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[ElevenLabs] API error:', error);
      return;
    }

    // Stream audio chunks to client
    const reader = response.body?.getReader();
    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Convert to base64 and send to client
      const base64 = Buffer.from(value).toString('base64');
      sendMessage(session.ws, {
        type: 'AUDIO_CHUNK',
        data: base64,
        sequence,
      });
    }

    console.log('[ElevenLabs] TTS complete for sequence:', sequence);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('[ElevenLabs] TTS aborted');
    } else {
      console.error('[ElevenLabs] Error:', error);
    }
  }
}

// ===========================================
// MESSAGE HANDLERS
// ===========================================

async function handleAudioChunk(session: ActiveSession, audioBase64: string): Promise<void> {
  // Send audio to Deepgram for transcription
  if (session.deepgramConnection) {
    try {
      // Decode base64 to buffer
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      session.deepgramConnection.send(audioBuffer);
    } catch (error) {
      console.error('[VoiceWS] Audio send error:', error);
    }
  }
}

function handleBargeIn(session: ActiveSession): void {
  console.log('[VoiceWS] Barge-in:', session.payload.sessionId);

  // Abort current AI processing
  if (session.abortController) {
    session.abortController.abort();
  }

  session.isAISpeaking = false;
  session.isProcessing = false;

  sendMessage(session.ws, { type: 'BARGE_IN_ACK' });
  sendMessage(session.ws, { type: 'AI_SPEAKING_END' });
}

function handleVADStart(session: ActiveSession): void {
  console.log('[VoiceWS] VAD start:', session.payload.sessionId);
  // User started speaking - could trigger barge-in if AI is speaking
  if (session.isAISpeaking) {
    handleBargeIn(session);
  }
}

function handleVADEnd(session: ActiveSession): void {
  console.log('[VoiceWS] VAD end:', session.payload.sessionId);
}

async function endSession(session: ActiveSession, reason: string): Promise<void> {
  const duration = Math.floor((Date.now() - session.startTime) / 1000);

  console.log('[VoiceWS] Ending session:', {
    sessionId: session.payload.sessionId,
    reason,
    durationSeconds: duration,
  });

  // Send session ended message
  sendMessage(session.ws, {
    type: 'SESSION_ENDED',
    reason,
    duration,
  });

  // Close connection
  session.ws.close(1000, reason);

  await cleanupSession(session, reason);
}

async function cleanupSession(session: ActiveSession, reason: string): Promise<void> {
  const sessionId = session.payload.sessionId;

  // Abort any ongoing AI processing
  if (session.abortController) {
    session.abortController.abort();
  }

  // Close Deepgram connection
  if (session.deepgramConnection) {
    try {
      session.deepgramConnection.finish();
    } catch (e) {
      // Ignore close errors
    }
    session.deepgramConnection = null;
  }

  // Clear timers
  if ((session as any).sessionTimer) {
    clearTimeout((session as any).sessionTimer);
  }

  // Remove from active sessions
  activeSessions.delete(sessionId);

  // Update database
  const duration = Math.floor((Date.now() - session.startTime) / 1000);
  const durationMinutes = Math.ceil(duration / 60);

  try {
    // Update session record
    await supabase
      .from('voice_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
      })
      .eq('id', sessionId);

    // Update voice usage
    await supabase.rpc('increment_voice_usage', {
      p_user_id: session.payload.userId,
      p_minutes: durationMinutes,
    });

    console.log('[VoiceWS] Session cleaned up:', {
      sessionId,
      reason,
      durationMinutes,
    });
  } catch (error) {
    console.error('[VoiceWS] Cleanup error:', error);
  }

  // Release Redis locks
  await releaseSessionLock(sessionId);
  await unregisterActiveSession(sessionId);
}

// ===========================================
// HELPERS
// ===========================================

function sendMessage(ws: WebSocket, message: ServerWSMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, message: string, code: string): void {
  sendMessage(ws, { type: 'ERROR', message, code });
}

async function updateSessionStatus(sessionId: string, status: string): Promise<void> {
  try {
    await supabase
      .from('voice_sessions')
      .update({
        status,
        started_at: status === 'active' ? new Date().toISOString() : undefined,
      })
      .eq('id', sessionId);
  } catch (error) {
    console.error('[VoiceWS] Status update error:', error);
  }
}

// ===========================================
// MAINTENANCE
// ===========================================

// Ping active connections
setInterval(() => {
  const now = Date.now();

  activeSessions.forEach((session, sessionId) => {
    // Check for inactivity
    if (now - session.lastActivity > INACTIVITY_TIMEOUT_MS) {
      console.log('[VoiceWS] Inactivity timeout:', sessionId);
      endSession(session, 'inactivity');
      return;
    }

    // Send ping
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.ping();
    }
  });
}, PING_INTERVAL_MS);

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================

process.on('SIGTERM', async () => {
  console.log('[VoiceWS] SIGTERM received, shutting down...');

  // End all active sessions
  for (const session of Array.from(activeSessions.values())) {
    await endSession(session, 'server_shutdown');
  }

  wss.close(() => {
    httpServer.close(() => {
      console.log('[VoiceWS] Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', async () => {
  console.log('[VoiceWS] SIGINT received, shutting down...');

  for (const session of Array.from(activeSessions.values())) {
    await endSession(session, 'server_shutdown');
  }

  wss.close(() => {
    httpServer.close(() => {
      console.log('[VoiceWS] Server closed');
      process.exit(0);
    });
  });
});

console.log('[VoiceWS] Server initialized');

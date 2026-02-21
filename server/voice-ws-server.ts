// ===========================================
// VOICE WEBSOCKET SERVER
// Standalone Node.js server for real-time voice
// Horizontally scalable with Redis coordination
// ===========================================

import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

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
}

// ===========================================
// CONFIGURATION
// ===========================================

const PORT = parseInt(process.env.PORT || process.env.VOICE_WS_PORT || '3001', 10);
const JWT_SECRET = process.env.VOICE_JWT_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDIS_URL = process.env.REDIS_URL;

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

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
// WEBSOCKET SERVER
// ===========================================

const wss = new WebSocketServer({ port: PORT });

console.log(`[VoiceWS] Server starting on port ${PORT}...`);

wss.on('listening', () => {
  console.log(`[VoiceWS] Server listening on ws://localhost:${PORT}`);
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

  // Create session entry
  const session: ActiveSession = {
    ws,
    payload,
    startTime: Date.now(),
    lastActivity: Date.now(),
    isProcessing: false,
  };

  activeSessions.set(payload.sessionId, session);

  // Register in Redis for cross-server visibility
  await registerActiveSession(payload.sessionId, payload.userId);

  // Update session status in database
  await updateSessionStatus(payload.sessionId, 'active');

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
// MESSAGE HANDLERS
// ===========================================

async function handleAudioChunk(session: ActiveSession, audioBase64: string): Promise<void> {
  // In full implementation, this would:
  // 1. Send audio to Deepgram for transcription
  // 2. When utterance ends, send to Claude for response
  // 3. Stream Claude response to ElevenLabs for TTS
  // 4. Send audio chunks back to client

  // For now, we'll implement a simplified echo/acknowledgment
  // Full implementation requires the VoiceSessionManager to be adapted for Node.js context

  console.log('[VoiceWS] Audio chunk received:', {
    sessionId: session.payload.sessionId,
    size: audioBase64.length,
  });

  // TODO: Integrate full voice pipeline
  // This requires adapting the VoiceSessionManager for the standalone server context
}

function handleBargeIn(session: ActiveSession): void {
  console.log('[VoiceWS] Barge-in:', session.payload.sessionId);

  // TODO: Stop current TTS playback and Claude generation
  sendMessage(session.ws, { type: 'BARGE_IN_ACK' });
  sendMessage(session.ws, { type: 'AI_SPEAKING_END' });
}

function handleVADStart(session: ActiveSession): void {
  console.log('[VoiceWS] VAD start:', session.payload.sessionId);
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
    console.log('[VoiceWS] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[VoiceWS] SIGINT received, shutting down...');

  for (const session of Array.from(activeSessions.values())) {
    await endSession(session, 'server_shutdown');
  }

  wss.close(() => {
    console.log('[VoiceWS] Server closed');
    process.exit(0);
  });
});

console.log('[VoiceWS] Server initialized');

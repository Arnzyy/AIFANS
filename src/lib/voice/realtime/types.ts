// ===========================================
// REALTIME VOICE TYPES
// WebSocket message types and session state
// ===========================================

// ===========================================
// CLIENT -> SERVER MESSAGES
// ===========================================

export type ClientWSMessage =
  | { type: 'AUDIO_CHUNK'; data: string; timestamp: number }
  | { type: 'BARGE_IN'; timestamp: number }
  | { type: 'VAD_START'; timestamp: number }
  | { type: 'VAD_END'; timestamp: number }
  | { type: 'END_SESSION'; reason: string }
  | { type: 'PING' };

// ===========================================
// SERVER -> CLIENT MESSAGES
// ===========================================

export type ServerWSMessage =
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

// ===========================================
// SESSION CONFIGURATION
// ===========================================

export interface SessionConfig {
  bargeInEnabled: boolean;
  maxSessionMinutes: number;
  silenceTimeoutMs: number;
  vadSensitivity: number;
}

// ===========================================
// REALTIME VOICE STATE
// ===========================================

export interface RealtimeVoiceState {
  sessionId: string | null;
  status: 'idle' | 'connecting' | 'active' | 'ending' | 'error';
  mode: 'call' | 'inline';
  isMuted: boolean;
  isSpeakerOn: boolean;
  isUserSpeaking: boolean;
  isAISpeaking: boolean;
  currentTranscript: string;
  currentAIText: string;
  durationSeconds: number;
  minutesUsed: number;
  minutesLimit: number;
  error: string | null;
}

// ===========================================
// VOICE PIPELINE STATE
// ===========================================

export interface VoicePipelineState {
  isProcessing: boolean;
  currentUtterance: string;
  partialResponse: string;
  abortController: AbortController | null;
  aiSpeakingStartTime: number | null;
  audioQueue: string[];
  sequenceNumber: number;
}

// ===========================================
// DEEPGRAM CONFIGURATION
// ===========================================

export interface DeepgramConfig {
  model: 'nova-2';
  language: 'en';
  encoding: 'linear16';
  sampleRate: 16000;
  channels: 1;
  interimResults: boolean;
  endpointing: number;
  utteranceEndMs: number;
  vadEvents: boolean;
  smartFormat: boolean;
  punctuate: boolean;
}

export const DEFAULT_DEEPGRAM_CONFIG: DeepgramConfig = {
  model: 'nova-2',
  language: 'en',
  encoding: 'linear16',
  sampleRate: 16000,
  channels: 1,
  interimResults: true,
  endpointing: 500,
  utteranceEndMs: 1500,
  vadEvents: true,
  smartFormat: true,
  punctuate: true,
};

// ===========================================
// ELEVENLABS CONFIGURATION
// ===========================================

export interface ElevenLabsStreamConfig {
  voiceId: string;
  modelId: 'eleven_turbo_v2_5' | 'eleven_multilingual_v2';
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  outputFormat: 'mp3_44100_128' | 'pcm_16000' | 'pcm_24000';
}

export const DEFAULT_ELEVENLABS_CONFIG: Partial<ElevenLabsStreamConfig> = {
  modelId: 'eleven_turbo_v2_5',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  speed: 1.0,
  outputFormat: 'mp3_44100_128',
};

// ===========================================
// SESSION METRICS
// ===========================================

export interface SessionMetrics {
  sttSeconds: number;
  ttsCharacters: number;
  llmInputTokens: number;
  llmOutputTokens: number;
  estimatedCostCents: number;
  avgLatencyMs: number;
  bargeInCount: number;
  latencyMeasurements: number[];
}

// ===========================================
// CONVERSATION MESSAGE
// ===========================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  durationMs?: number;
  wasInterrupted?: boolean;
}

// ===========================================
// CONNECT API TYPES
// ===========================================

export interface ConnectRequest {
  personalityId: string;
  mode: 'call' | 'inline';
}

export interface ConnectResponse {
  sessionId: string;
  wsUrl: string;
  token: string;
  config: SessionConfig;
}

// ===========================================
// ERROR CODES
// ===========================================

export const ERROR_CODES = {
  AUTH_FAILED: 'AUTH_FAILED',
  NOT_PREMIUM: 'NOT_PREMIUM',
  USAGE_LIMIT_REACHED: 'USAGE_LIMIT_REACHED',
  VOICE_NOT_ENABLED: 'VOICE_NOT_ENABLED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  CONCURRENT_SESSION: 'CONCURRENT_SESSION',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  PIPELINE_ERROR: 'PIPELINE_ERROR',
  DEEPGRAM_ERROR: 'DEEPGRAM_ERROR',
  CLAUDE_ERROR: 'CLAUDE_ERROR',
  ELEVENLABS_ERROR: 'ELEVENLABS_ERROR',
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

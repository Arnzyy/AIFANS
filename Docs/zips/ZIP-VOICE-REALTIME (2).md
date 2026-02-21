# ZIP: REAL-TIME VOICE CHAT (Phase 2)

> **Project**: LYRA
> **ZIP ID**: VOICE-REALTIME
> **Priority**: HIGH — Headline feature
> **Depends On**: Existing chat system (v2), AI personality system, subscription system
> **Note**: This is a COMPLETE voice implementation — no prior voice features exist. All tables, services, and components are created from scratch.
> **Classification**: Premium-only feature (higher tier)

---

## ENTRY CRITERIA

Before starting this ZIP, confirm:

```
☑ v2 chat system operational (chat-service-enhanced.ts)
☑ AI personality wizard + prompt builder working
☑ Subscription system with tier checking functional
☑ Supabase Auth + RLS in place
☑ ElevenLabs API key active with streaming access (Starter plan minimum)
☑ Deepgram API key active with streaming STT access (free tier is fine)
☑ Claude API key active with streaming access
☑ Upstash Redis configured for rate limiting
```

**NOTE: No prior voice features exist. This ZIP creates ALL voice infrastructure from scratch.**

---

## BUILD ORDER (Implement in this sequence)

Claude Code should build this feature in stages, testing each before moving on:

```
STAGE 1: Foundation (Database + Voice Library)
  1. Run ALL SQL migrations (voice_library, model_voice_settings, 
     voice_sessions, voice_session_messages, voice_usage_limits, feature_flags)
  2. Build voice-library-service.ts
  3. Build API routes: /api/voice/library, /api/creator/models/[id]/voice
  4. Build VoiceLibraryPicker + VoiceSettingsPanel components
  5. TEST: Creator can select and configure a voice for their personality

STAGE 2: Server Pipeline (Deepgram + Claude + ElevenLabs)
  6. Build realtime/types.ts
  7. Build deepgram-stream.ts — test with raw audio input
  8. Build claude-stream.ts — test streaming responses
  9. Build elevenlabs-stream.ts — test text-to-audio streaming
  10. Build barge-in-handler.ts + usage-tracker.ts
  11. Build voice-session-manager.ts (orchestrator)
  12. TEST: Pipeline works end-to-end in isolation

STAGE 3: WebSocket Server
  13. Build server/voice-ws-server.ts
  14. Build /api/voice/realtime/connect route
  15. TEST: Client can connect, send audio, receive audio back

STAGE 4: Client UI
  16. Build useRealtimeVoice.ts hook (mic capture, WS, VAD, playback)
  17. Build VoiceCallScreen.tsx (full-screen call UI)
  18. Build InlineVoiceMic.tsx (inline chat mic)
  19. Build VoiceCallControls + VoiceVisualizer
  20. TEST: Full golden path — call a persona, speak, hear response

STAGE 5: Polish
  21. Barge-in testing + admin toggle
  22. Usage limits + warnings
  23. iOS Safari testing
  24. Premium gating
```

---

## WHAT WE'RE BUILDING

A real-time voice conversation system where subscribers can **talk live** to an AI persona — like being on the phone. Two UX modes:

1. **Full-screen call** — Tap "Call" button, full-screen phone UI (speaker, mute, end call)
2. **Inline voice** — Mic button in chat, real-time voice while seeing the conversation

### Pipeline

```
User speaks into mic
    ↓
Browser captures audio via Web Audio API
    ↓
Audio chunks streamed over WebSocket to server
    ↓
Server streams audio to Deepgram (real-time STT)
    ↓
Transcribed text streamed to Claude (with full personality prompt + conversation history)
    ↓
Claude response tokens streamed to ElevenLabs (streaming TTS)
    ↓
TTS audio chunks streamed back over WebSocket to browser
    ↓
Browser plays audio in real-time via AudioWorklet
```

### Barge-In (Interruptible)

When the AI is speaking and the user starts talking:
1. VAD (Voice Activity Detection) on client detects user speech
2. Client sends BARGE_IN event over WebSocket
3. Server immediately stops Claude generation + ElevenLabs synthesis
4. Server flushes audio buffer
5. New user speech is processed as next turn

**Barge-in is toggleable via admin panel feature flag.** When disabled, system is turn-based (user speaks → pause detected → AI responds).

---

## ARCHITECTURE DECISIONS

| Decision | Choice | Reason |
|----------|--------|--------|
| Transport | WebSocket (ws) | Bidirectional real-time audio streaming |
| STT | Deepgram Nova-2 Streaming | Best real-time accuracy, <300ms latency, interim results |
| LLM | Claude (Sonnet) via streaming | Existing personality system, consistent with chat |
| TTS | ElevenLabs Streaming | Existing voice library, low latency streaming, best quality |
| VAD | Client-side @ricky0123/vad-web | Runs in browser, no server round-trip for detection |
| Audio Format | PCM 16-bit 16kHz (to server), MP3 (from server) | PCM for STT compatibility, MP3 for efficient playback |
| Call Recording | Optional — store transcript + summary | Privacy-first, no audio storage by default |

---

## DATABASE CHANGES

### New Tables

```sql
-- ============================================
-- FOUNDATION: voice_library
-- Available TTS voices (seeded from ElevenLabs)
-- This would have been created in Phase 1 but was never implemented
-- ============================================
CREATE TABLE voice_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'elevenlabs' CHECK (provider IN ('elevenlabs', 'openai', 'playht')),
  provider_voice_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  gender TEXT CHECK (gender IN ('female', 'male', 'neutral')),
  age_range TEXT CHECK (age_range IN ('young', 'middle', 'mature')),
  accent TEXT DEFAULT 'neutral',
  style TEXT DEFAULT 'conversational',
  preview_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_voice_id)
);

-- Seed with starter voices from ElevenLabs
-- IMPORTANT: After creating your ElevenLabs account, browse the Voice Library
-- at https://elevenlabs.io/voice-library and add voices you like to your collection.
-- Then get their voice IDs from the API or dashboard and insert them here.
-- Below are placeholder rows — replace provider_voice_id values with real IDs from your account.
INSERT INTO voice_library (provider, provider_voice_id, name, description, gender, age_range, accent, style) VALUES
  ('elevenlabs', 'REPLACE_WITH_REAL_ID_1', 'Soft & Sultry', 'Warm, breathy female voice with intimate tone', 'female', 'young', 'american', 'conversational'),
  ('elevenlabs', 'REPLACE_WITH_REAL_ID_2', 'Playful Brit', 'Energetic British female, flirty and fun', 'female', 'young', 'british', 'conversational'),
  ('elevenlabs', 'REPLACE_WITH_REAL_ID_3', 'Confident & Bold', 'Strong, assertive female voice', 'female', 'middle', 'american', 'conversational'),
  ('elevenlabs', 'REPLACE_WITH_REAL_ID_4', 'Sweet & Innocent', 'Gentle, higher-pitched feminine voice', 'female', 'young', 'neutral', 'conversational'),
  ('elevenlabs', 'REPLACE_WITH_REAL_ID_5', 'Husky Night Owl', 'Deep, raspy female voice for late-night vibe', 'female', 'middle', 'american', 'conversational'),
  ('elevenlabs', 'REPLACE_WITH_REAL_ID_6', 'Aussie Charm', 'Bright Australian female accent', 'female', 'young', 'australian', 'conversational'),
  ('elevenlabs', 'REPLACE_WITH_REAL_ID_7', 'Eastern European', 'Slight Eastern European accent, mysterious', 'female', 'young', 'european', 'conversational'),
  ('elevenlabs', 'REPLACE_WITH_REAL_ID_8', 'Girl Next Door', 'Casual, relatable American female', 'female', 'young', 'american', 'conversational');

-- RLS for voice_library (read-only for authenticated users)
ALTER TABLE voice_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view voices"
  ON voice_library FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- FOUNDATION: model_voice_settings
-- Per-creator-model voice configuration
-- Links a creator's AI personality to a specific voice
-- ============================================
CREATE TABLE model_voice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  personality_id UUID NOT NULL REFERENCES ai_personalities(id) ON DELETE CASCADE,
  
  -- Voice selection
  voice_id UUID REFERENCES voice_library(id),
  custom_voice_id TEXT,              -- For cloned voices not in library
  
  -- Voice style controls
  stability NUMERIC(3,2) DEFAULT 0.5,
  similarity_boost NUMERIC(3,2) DEFAULT 0.75,
  style_exaggeration NUMERIC(3,2) DEFAULT 0.0,
  speed NUMERIC(3,2) DEFAULT 1.0,
  
  -- Feature toggles
  voice_enabled BOOLEAN DEFAULT FALSE,
  realtime_enabled BOOLEAN DEFAULT FALSE,
  
  -- Realtime-specific settings (can differ from async voice)
  realtime_voice_id TEXT,            -- Can use different voice for realtime
  realtime_stability NUMERIC(3,2) DEFAULT 0.5,
  realtime_similarity NUMERIC(3,2) DEFAULT 0.75,
  realtime_speed NUMERIC(3,2) DEFAULT 1.0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(creator_id, personality_id)
);

-- RLS for model_voice_settings
ALTER TABLE model_voice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own voice settings"
  ON model_voice_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = model_voice_settings.creator_id
      AND creators.user_id = auth.uid()
    )
  );

CREATE POLICY "Subscribers can view voice settings for subscribed creators"
  ON model_voice_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subscriptions
      WHERE subscriptions.subscriber_id = auth.uid()
      AND subscriptions.creator_id = model_voice_settings.creator_id
      AND subscriptions.status IN ('active', 'trialing')
    )
  );

-- ============================================
-- REALTIME: voice_sessions
-- Tracks each live voice call/session
-- ============================================
CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  personality_id UUID NOT NULL REFERENCES ai_personalities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'connecting' CHECK (status IN ('connecting', 'active', 'paused', 'ended', 'failed')),
  mode TEXT NOT NULL DEFAULT 'call' CHECK (mode IN ('call', 'inline')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  stt_seconds NUMERIC(10,2) DEFAULT 0,
  tts_characters INTEGER DEFAULT 0,
  llm_input_tokens INTEGER DEFAULT 0,
  llm_output_tokens INTEGER DEFAULT 0,
  estimated_cost_cents INTEGER DEFAULT 0,
  avg_latency_ms INTEGER,
  barge_in_count INTEGER DEFAULT 0,
  ended_reason TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_sessions_subscriber ON voice_sessions(subscriber_id, created_at DESC);
CREATE INDEX idx_voice_sessions_creator ON voice_sessions(creator_id, created_at DESC);
CREATE INDEX idx_voice_sessions_status ON voice_sessions(status) WHERE status = 'active';

-- ============================================
-- Table: voice_session_messages
-- Transcript of the voice conversation
-- ============================================
CREATE TABLE voice_session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  duration_ms INTEGER,
  stt_confidence NUMERIC(3,2),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_messages_session ON voice_session_messages(session_id, timestamp_ms);

-- ============================================
-- Table: voice_usage_limits
-- Per-user voice minute tracking for billing
-- ============================================
CREATE TABLE voice_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  minutes_used NUMERIC(10,2) DEFAULT 0,
  minutes_limit INTEGER NOT NULL DEFAULT 60,
  alert_75_sent BOOLEAN DEFAULT FALSE,
  alert_90_sent BOOLEAN DEFAULT FALSE,
  limit_reached_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(subscriber_id, period_start)
);

CREATE INDEX idx_voice_usage_subscriber ON voice_usage_limits(subscriber_id, period_start DESC);
```

### Modify Existing Tables

```sql
-- Add feature flags (create table if it doesn't exist)
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (flag_key, flag_value, description) VALUES
  ('VOICE_REALTIME_ENABLED', 'true', 'Master switch for real-time voice feature'),
  ('VOICE_BARGE_IN_ENABLED', 'true', 'Allow users to interrupt AI mid-speech'),
  ('VOICE_MAX_SESSION_MINUTES', '30', 'Maximum single session duration in minutes'),
  ('VOICE_MONTHLY_LIMIT_MINUTES', '60', 'Monthly voice minutes per premium subscriber')
ON CONFLICT (flag_key) DO NOTHING;
```

### RLS Policies

```sql
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscribers can view own sessions"
  ON voice_sessions FOR SELECT
  USING (auth.uid() = subscriber_id);

CREATE POLICY "System can insert sessions"
  ON voice_sessions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "System can update own sessions"
  ON voice_sessions FOR UPDATE
  USING (auth.uid() = subscriber_id);

CREATE POLICY "Creators can view their personality sessions"
  ON voice_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creators
      WHERE creators.id = voice_sessions.creator_id
      AND creators.user_id = auth.uid()
    )
  );

ALTER TABLE voice_session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session messages"
  ON voice_session_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM voice_sessions
      WHERE voice_sessions.id = voice_session_messages.session_id
      AND voice_sessions.subscriber_id = auth.uid()
    )
  );

ALTER TABLE voice_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON voice_usage_limits FOR SELECT
  USING (auth.uid() = subscriber_id);
```

---

## FILE STRUCTURE

```
lib/voice/
├── types.ts                    # Shared voice types (library, settings)
├── voice-library-service.ts    # CRUD for voice_library + model_voice_settings
├── realtime/
│   ├── types.ts                # All TypeScript types for realtime voice
│   ├── voice-session-manager.ts # Server-side session orchestration
│   ├── deepgram-stream.ts      # Deepgram streaming STT wrapper
│   ├── claude-stream.ts        # Claude streaming with personality prompt
│   ├── elevenlabs-stream.ts    # ElevenLabs streaming TTS wrapper
│   ├── barge-in-handler.ts     # Barge-in detection + pipeline interruption
│   ├── usage-tracker.ts        # Track minutes, costs, enforce limits
│   └── index.ts                # Exports

server/
├── voice-ws-server.ts          # Standalone WebSocket server

app/api/voice/
├── library/route.ts            # GET — List available voices from voice_library
├── realtime/
│   ├── connect/route.ts        # POST — Initiate session, return WS URL + token
│   ├── session/[sessionId]/
│   │   ├── route.ts            # GET session status, PATCH to end
│   │   └── transcript/route.ts # GET full transcript after session ends

app/api/creator/models/[id]/voice/
├── route.ts                    # GET/PUT — Creator voice settings per personality

components/voice/
├── VoiceLibraryPicker.tsx      # Voice selection UI for creator settings
├── VoiceSettingsPanel.tsx      # Creator panel to configure voice per personality
├── realtime/
│   ├── VoiceCallScreen.tsx     # Full-screen phone call UI
│   ├── InlineVoiceMic.tsx      # Inline mic button for chat view
│   ├── VoiceCallControls.tsx   # Mute, speaker, end call buttons
│   ├── VoiceVisualizer.tsx     # Audio waveform / pulse animation
│   ├── VoiceCallProvider.tsx   # React context for voice state
│   ├── useRealtimeVoice.ts     # Core hook — manages WebSocket, audio, VAD
│   ├── useVAD.ts               # Voice Activity Detection hook
│   └── AudioPlaybackManager.ts # AudioWorklet for smooth streaming playback
```

---

## IMPLEMENTATION DETAILS

### 0a. Voice Library Service

```typescript
// lib/voice/voice-library-service.ts
//
// CRUD for voice_library and model_voice_settings tables.
// Used by creator settings panel and the realtime pipeline.
//
// KEY FUNCTIONS:
//
// getAvailableVoices(): Promise<VoiceLibraryEntry[]>
//   - Returns all active voices from voice_library
//   - Cached in memory for 5 minutes (voices rarely change)
//
// getVoiceById(voiceId: string): Promise<VoiceLibraryEntry | null>
//   - Single voice lookup by UUID
//
// getVoiceSettingsForPersonality(personalityId: string): Promise<ModelVoiceSettings | null>
//   - Returns creator's voice config for a specific personality
//   - Used by realtime pipeline to know which ElevenLabs voice ID to use
//
// updateVoiceSettings(creatorId: string, personalityId: string, settings: Partial<ModelVoiceSettings>): Promise<ModelVoiceSettings>
//   - Upsert voice settings for a personality
//   - Called from creator settings panel
//
// getElevenLabsVoiceId(personalityId: string): Promise<string | null>
//   - Resolves the actual ElevenLabs provider_voice_id for a personality
//   - Checks realtime_voice_id first, falls back to main voice_id
//   - This is what the TTS pipeline needs

import { createClient } from '@/lib/supabase/server';

export interface VoiceLibraryEntry {
  id: string;
  provider: 'elevenlabs' | 'openai' | 'playht';
  provider_voice_id: string;
  name: string;
  description: string | null;
  gender: 'female' | 'male' | 'neutral';
  age_range: 'young' | 'middle' | 'mature';
  accent: string;
  style: string;
  preview_url: string | null;
  is_active: boolean;
}

export interface ModelVoiceSettings {
  id: string;
  creator_id: string;
  personality_id: string;
  voice_id: string | null;
  custom_voice_id: string | null;
  stability: number;
  similarity_boost: number;
  style_exaggeration: number;
  speed: number;
  voice_enabled: boolean;
  realtime_enabled: boolean;
  realtime_voice_id: string | null;
  realtime_stability: number;
  realtime_similarity: number;
  realtime_speed: number;
}
```

### 0b. Voice Library Picker Component

```typescript
// components/voice/VoiceLibraryPicker.tsx
//
// Displays available voices from voice_library table.
// Creator selects a voice for their AI personality.
//
// FEATURES:
//   - Grid/list of voices with name, description, accent, age
//   - Play preview button (uses preview_url from ElevenLabs)
//   - Filter by gender, accent, age range
//   - Currently selected voice highlighted
//   - On select → calls onChange with voice ID
//
// INTEGRATION:
//   - Used inside VoiceSettingsPanel
//   - Fetches from GET /api/voice/library

'use client';

interface VoiceLibraryPickerProps {
  selectedVoiceId: string | null;
  onChange: (voiceId: string) => void;
}

// Fetch voices from /api/voice/library
// Display as cards with preview playback
// Filter controls for gender/accent
// Highlight selected voice
```

### 0c. Voice Settings Panel Component

```typescript
// components/voice/VoiceSettingsPanel.tsx
//
// Creator-facing panel to configure voice for their AI personality.
// Shown in the creator dashboard under personality settings.
//
// SECTIONS:
//   1. Enable/Disable voice (toggle)
//   2. Select voice from VoiceLibraryPicker
//   3. Voice style sliders:
//      - Stability (0-1): Higher = more consistent, lower = more expressive
//      - Similarity Boost (0-1): Higher = closer to original voice
//      - Speed (0.5-2.0): Playback speed
//   4. Enable/Disable realtime voice (toggle)
//   5. Optional: Different voice for realtime (if creator wants)
//   6. Test button: Generate a sample phrase with current settings
//
// SAVES TO: model_voice_settings via PUT /api/creator/models/[id]/voice

'use client';

interface VoiceSettingsPanelProps {
  creatorId: string;
  personalityId: string;
}

// Fetch existing settings on mount
// VoiceLibraryPicker for voice selection
// Sliders for stability, similarity, speed
// Toggle for realtime_enabled
// Save button -> PUT /api/creator/models/[id]/voice
// Test button -> POST /api/voice/test (generates sample audio)
```

### 0d. Voice Library API Route

```typescript
// app/api/voice/library/route.ts
//
// GET — Returns all active voices from voice_library.
// Authenticated users only.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: voices, error } = await supabase
    .from('voice_library')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }

  return NextResponse.json(voices);
}
```

### 0e. Creator Voice Settings API Route

```typescript
// app/api/creator/models/[id]/voice/route.ts
//
// GET — Returns voice settings for a personality
// PUT — Updates voice settings for a personality
// Creator auth required.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const personalityId = params.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user is the creator who owns this personality
  // Fetch from model_voice_settings where personality_id = personalityId
  // Return settings or empty defaults if none exist
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const personalityId = params.id;
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user is the creator who owns this personality
  // Validate input (stability 0-1, speed 0.5-2.0, etc)
  // Upsert into model_voice_settings
  // Return updated settings
}
```

### 1. types.ts (Realtime)

```typescript
// lib/voice/realtime/types.ts

// Client -> Server
export type ClientWSMessage =
  | { type: 'AUDIO_CHUNK'; data: string; timestamp: number }
  | { type: 'BARGE_IN'; timestamp: number }
  | { type: 'VAD_START'; timestamp: number }
  | { type: 'VAD_END'; timestamp: number }
  | { type: 'END_SESSION'; reason: string }
  | { type: 'PING' };

// Server -> Client
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

export interface SessionConfig {
  bargeInEnabled: boolean;
  maxSessionMinutes: number;
  silenceTimeoutMs: number;
  vadSensitivity: number;
}

export interface VoiceSession {
  id: string;
  subscriberId: string;
  creatorId: string;
  personalityId: string;
  status: 'connecting' | 'active' | 'paused' | 'ended' | 'failed';
  mode: 'call' | 'inline';
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
}

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
}

export interface ElevenLabsStreamConfig {
  voiceId: string;
  modelId: 'eleven_turbo_v2_5';
  stability: number;
  similarityBoost: number;
  speed: number;
  outputFormat: 'mp3_44100_128';
}

export interface VoicePipelineState {
  isProcessing: boolean;
  currentDeepgramConnection: any;
  currentClaudeStream: any;
  currentElevenLabsStream: any;
  abortController: AbortController | null;
}
```

### 2. voice-session-manager.ts

```typescript
// lib/voice/realtime/voice-session-manager.ts
//
// ORCHESTRATOR: Manages the full lifecycle of a voice session.
//
// FLOW:
//   1. Client connects via WebSocket
//   2. Manager creates a Deepgram live connection
//   3. Client audio chunks -> piped to Deepgram
//   4. Deepgram transcript events -> accumulated until utterance end
//   5. Complete utterance -> sent to Claude with full personality prompt + conversation history
//   6. Claude tokens -> streamed to ElevenLabs text-to-speech
//   7. ElevenLabs audio chunks -> streamed back to client via WebSocket
//   8. If BARGE_IN received -> abort Claude + ElevenLabs, flush buffers, resume listening
//
// IMPORTANT IMPLEMENTATION NOTES:
//   - Use AbortController to cancel Claude fetch on barge-in
//   - ElevenLabs streaming endpoint: POST /v1/text-to-speech/{voice_id}/stream
//     with chunked transfer encoding — send text chunks as they arrive from Claude
//   - Deepgram: Use @deepgram/sdk LiveClient with keepAlive
//   - Maintain conversation history array in memory for this session
//   - On session end, bulk-insert messages to voice_session_messages table
//   - Update voice_sessions with final duration + usage stats
//   - Check voice_usage_limits before each response — end session if limit reached

import { createClient } from '@/lib/supabase/server';
import { DeepgramStream } from './deepgram-stream';
import { ClaudeStream } from './claude-stream';
import { ElevenLabsStream } from './elevenlabs-stream';
import { BargeInHandler } from './barge-in-handler';
import { UsageTracker } from './usage-tracker';
import { buildPersonalityPrompt } from '@/lib/ai/personality/prompt-builder';
import type { ClientWSMessage, ServerWSMessage, VoiceSession, SessionConfig, VoicePipelineState } from './types';

export class VoiceSessionManager {
  private session: VoiceSession;
  private config: SessionConfig;
  private pipeline: VoicePipelineState;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  private deepgram: DeepgramStream;
  private claude: ClaudeStream;
  private elevenlabs: ElevenLabsStream;
  private bargeIn: BargeInHandler;
  private usage: UsageTracker;
  private ws: WebSocket;
  private systemPrompt: string;
  private sessionTimer: NodeJS.Timeout | null = null;
  private usageInterval: NodeJS.Timeout | null = null;

  constructor(ws: WebSocket, session: VoiceSession, config: SessionConfig) {
    // Store references
    // Initialize pipeline state with isProcessing = false
    // Initialize empty conversation history
    // Load personality prompt via buildPersonalityPrompt(session.personalityId)
    // Create DeepgramStream, ClaudeStream, ElevenLabsStream instances
    // Create BargeInHandler and UsageTracker
    // Set session max duration timer
    // Set usage update interval (every 30s, send USAGE_UPDATE to client)
  }

  async initialize(): Promise<void> {
    // 1. Verify subscriber has premium subscription
    // 2. Check voice_usage_limits — has minutes remaining?
    // 3. Load personality + voice settings from DB
    // 4. Build system prompt with personality
    // 5. Load last N messages from chat history for context continuity
    // 6. Connect to Deepgram streaming
    // 7. Send SESSION_READY to client
    // 8. Update voice_sessions status to 'active'
  }

  async handleClientMessage(message: ClientWSMessage): Promise<void> {
    switch (message.type) {
      case 'AUDIO_CHUNK':
        this.deepgram.sendAudio(Buffer.from(message.data, 'base64'));
        break;
      case 'VAD_START':
        if (this.pipeline.isProcessing && this.config.bargeInEnabled) {
          await this.handleBargeIn();
        }
        break;
      case 'VAD_END':
        break;
      case 'BARGE_IN':
        await this.handleBargeIn();
        break;
      case 'END_SESSION':
        await this.endSession(message.reason);
        break;
      case 'PING':
        this.send({ type: 'PONG' });
        break;
    }
  }

  private async handleBargeIn(): Promise<void> {
    // 1. Call bargeIn.interrupt() — aborts Claude + ElevenLabs
    // 2. Send BARGE_IN_ACK to client
    // 3. Reset pipeline state
    // 4. Increment barge_in_count on session
    // 5. Add partial AI response to conversation history
  }

  private async onTranscriptComplete(text: string): Promise<void> {
    // Called when Deepgram detects end of utterance (final transcript)
    //
    // 1. Send TRANSCRIPT_USER { text, isFinal: true } to client
    // 2. Add { role: 'user', content: text } to conversation history
    // 3. Check usage limits — if exceeded, end session
    // 4. Set pipeline.isProcessing = true
    // 5. Create new AbortController
    // 6. Send AI_SPEAKING_START to client
    // 7. Start Claude stream with system prompt + conversation history
    // 8. As Claude tokens arrive:
    //    a. Send TRANSCRIPT_AI { text: token, isFinal: false } to client
    //    b. Buffer tokens, send to ElevenLabs every ~50 chars or sentence boundary
    // 9. As ElevenLabs audio chunks arrive:
    //    a. Send AUDIO_CHUNK { data: base64Audio, sequence: n } to client
    // 10. When Claude stream ends:
    //    a. Send TRANSCRIPT_AI { text: fullResponse, isFinal: true }
    //    b. Flush remaining text to ElevenLabs
    //    c. Send AI_SPEAKING_END when last audio chunk sent
    //    d. Add { role: 'assistant', content: fullResponse } to history
    //    e. Set pipeline.isProcessing = false
    //    f. Update usage tracker
  }

  private async endSession(reason: string): Promise<void> {
    // 1. Close Deepgram connection
    // 2. Abort any active Claude/ElevenLabs streams
    // 3. Clear timers
    // 4. Calculate final duration and costs
    // 5. Bulk-insert conversation history to voice_session_messages
    // 6. Update voice_sessions with final stats
    // 7. Update voice_usage_limits
    // 8. Send SESSION_ENDED to client
    // 9. Close WebSocket
  }

  private send(message: ServerWSMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
```

### 3. deepgram-stream.ts

```typescript
// lib/voice/realtime/deepgram-stream.ts
//
// Wraps Deepgram streaming STT. Receives raw PCM audio, outputs transcript events.
//
// npm install @deepgram/sdk
//
// IMPORTANT:
//   - Use Nova-2 model for best accuracy + speed
//   - Enable interim_results for live transcript display
//   - Set endpointing to 500ms — how long silence before utterance complete
//   - Enable utterance_end_ms as backup endpointing
//   - Enable vad_events for server-side VAD confirmation
//   - Handle connection drops — auto-reconnect with exponential backoff
//   - Deepgram keepAlive() to prevent timeout during AI speaking phases

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import type { DeepgramConfig } from './types';

export class DeepgramStream {
  private client: any;
  private connection: any;
  private isConnected: boolean = false;
  private onTranscript: (text: string, isFinal: boolean) => void;
  private onUtteranceEnd: (fullText: string) => void;
  private currentUtterance: string = '';

  constructor(
    onTranscript: (text: string, isFinal: boolean) => void,
    onUtteranceEnd: (fullText: string) => void
  ) {
    // Store callbacks
    // Initialize Deepgram client with API key from env
  }

  async connect(): Promise<void> {
    // Create live transcription connection with config:
    // {
    //   model: 'nova-2',
    //   language: 'en',
    //   encoding: 'linear16',
    //   sample_rate: 16000,
    //   channels: 1,
    //   interim_results: true,
    //   endpointing: 500,
    //   utterance_end_ms: 1500,
    //   vad_events: true,
    //   smart_format: true,
    //   filler_words: false,
    //   punctuate: true
    // }
    //
    // Listen for events:
    //   Transcript -> if is_final append to currentUtterance
    //   UtteranceEnd -> call onUtteranceEnd(currentUtterance), reset
    //   Error -> log and attempt reconnect
    //   Close -> attempt reconnect if session active
  }

  sendAudio(audioBuffer: Buffer): void {
    if (this.isConnected) this.connection.send(audioBuffer);
  }

  keepAlive(): void {
    // Prevent timeout during AI speaking
    this.connection.keepAlive();
  }

  resetUtterance(): void {
    this.currentUtterance = '';
  }

  async disconnect(): Promise<void> {
    // Close gracefully
  }
}
```

### 4. claude-stream.ts

```typescript
// lib/voice/realtime/claude-stream.ts
//
// Streams Claude responses optimized for SPOKEN output.
//
// Key difference from chat: shorter responses, natural speech patterns,
// no formatting. Uses AbortController for barge-in cancellation.

import Anthropic from '@anthropic-ai/sdk';

const VOICE_SYSTEM_ADDITION = `

VOICE CONVERSATION MODE:
You are in a live voice call. Your responses will be spoken aloud via text-to-speech.

Rules for voice mode:
- Keep responses concise: 1-3 sentences for casual chat, up to 5 for complex topics
- Use natural spoken language — contractions, conversational tone
- No markdown, no bullet points, no asterisks, no emojis, no special formatting
- No "As an AI" or breaking character
- Use "..." for natural pauses if needed
- React naturally to being interrupted (if barge-in occurs)
- Sound like a real person on a phone call, not a text message
- Match the energy of the conversation — if they're excited, be excited back
`;

export class ClaudeStream {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = 'claude-sonnet-4-20250514';
  }

  async *stream(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    abortSignal: AbortSignal
  ): AsyncGenerator<{ type: 'token' | 'done'; text: string; inputTokens?: number; outputTokens?: number }> {
    // 1. Combine personality system prompt with VOICE_SYSTEM_ADDITION
    // 2. Create streaming message:
    //    const stream = await this.client.messages.create({
    //      model: this.model,
    //      max_tokens: 300,
    //      system: systemPrompt + VOICE_SYSTEM_ADDITION,
    //      messages: conversationHistory,
    //      stream: true,
    //    });
    // 3. Iterate, yielding tokens. On abort, stop cleanly.
    // 4. On message_stop, yield done with token counts.
  }
}
```

### 5. elevenlabs-stream.ts

```typescript
// lib/voice/realtime/elevenlabs-stream.ts
//
// Streams text to ElevenLabs, receives audio chunks back.
//
// Option A (IMPLEMENT FIRST): Input Streaming via WebSocket
//   wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input
//   - Send text chunks as they arrive from Claude
//   - Receive audio chunks back
//   - BEST LATENCY — audio starts before full text ready
//
// Option B (FALLBACK): Sentence-level batching
//   - Buffer until sentence boundary (. ! ?)
//   - POST /v1/text-to-speech/{voice_id}/stream per sentence
//   - Higher latency but more reliable
//
// Use eleven_turbo_v2_5 for lowest latency
// Output: mp3_44100_128

import type { ElevenLabsStreamConfig } from './types';

export class ElevenLabsStream {
  private apiKey: string;
  private config: ElevenLabsStreamConfig;
  private ws: WebSocket | null = null;
  private onAudioChunk: (audioData: Buffer, sequence: number) => void;
  private sequence: number = 0;
  private totalCharacters: number = 0;

  constructor(
    config: ElevenLabsStreamConfig,
    onAudioChunk: (audioData: Buffer, sequence: number) => void
  ) {
    this.apiKey = process.env.ELEVENLABS_API_KEY!;
    this.config = config;
    this.onAudioChunk = onAudioChunk;
  }

  async connect(): Promise<void> {
    // Open WS to ElevenLabs stream-input endpoint
    // Send initial config with voice_settings
    // Listen for audio messages, decode base64, call onAudioChunk
  }

  sendText(text: string): void {
    // { "text": text, "try_trigger_generation": true }
    this.totalCharacters += text.length;
  }

  flush(): void {
    // { "text": "" } to flush remaining audio
  }

  abort(): void {
    // Close WS immediately, reset sequence
  }

  getCharacterCount(): number { return this.totalCharacters; }

  async disconnect(): Promise<void> { /* graceful close */ }
}
```

### 6. barge-in-handler.ts

```typescript
// lib/voice/realtime/barge-in-handler.ts
//
// FLOW:
//   1. Client VAD detects user speech while AI playing
//   2. Client sends BARGE_IN
//   3. Handler aborts Claude + ElevenLabs, sends ACK, captures partial response
//
// DEBOUNCING: Ignore within 500ms of each other
// MIN SPEAKING: Ignore if AI speaking < 300ms (noise)
// GRACEFUL DEGRADATION: Errors fall back to turn-based
// ADMIN TOGGLE: VOICE_BARGE_IN_ENABLED feature flag

export class BargeInHandler {
  private lastBargeInTime: number = 0;
  private readonly debounceMs: number = 500;
  private readonly minSpeakingMs: number = 300;
  private enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  shouldInterrupt(aiSpeakingStartTime: number): boolean {
    if (!this.enabled) return false;
    const now = Date.now();
    if (now - this.lastBargeInTime < this.debounceMs) return false;
    if (now - aiSpeakingStartTime < this.minSpeakingMs) return false;
    this.lastBargeInTime = now;
    return true;
  }

  async interrupt(
    abortController: AbortController | null,
    elevenlabs: any,
    partialResponse: string
  ): Promise<string> {
    if (abortController) abortController.abort();
    elevenlabs.abort();
    return partialResponse;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
```

### 7. usage-tracker.ts

```typescript
// lib/voice/realtime/usage-tracker.ts
//
// COSTS (per minute):
//   Deepgram STT:     ~$0.0043/min
//   Claude Sonnet:    ~$0.01-0.03/min
//   ElevenLabs TTS:   ~$0.018/min
//   Total:            ~$0.03-0.05/min
//
// LIMITS: Monthly minutes (feature_flags), max session duration,
// alerts at 75% and 90%, hard stop at 100%.
// Auto-creates period row on first use each month.

import { createClient } from '@/lib/supabase/server';

export class UsageTracker {
  private subscriberId: string;
  private sessionStart: number;
  private sttSeconds: number = 0;
  private ttsCharacters: number = 0;
  private llmInputTokens: number = 0;
  private llmOutputTokens: number = 0;

  constructor(subscriberId: string) {
    this.subscriberId = subscriberId;
    this.sessionStart = Date.now();
  }

  async checkLimit(): Promise<{ allowed: boolean; minutesUsed: number; minutesLimit: number }> {
    // Get or create current period, check minutes_used vs minutes_limit
  }

  async getOrCreatePeriod(): Promise<{ minutesUsed: number; minutesLimit: number }> {
    // Check for existing row, create if needed with limit from feature_flags
  }

  addSTTUsage(seconds: number): void { this.sttSeconds += seconds; }
  addTTSUsage(characters: number): void { this.ttsCharacters += characters; }
  addLLMUsage(inputTokens: number, outputTokens: number): void {
    this.llmInputTokens += inputTokens;
    this.llmOutputTokens += outputTokens;
  }

  getSessionDurationSeconds(): number {
    return Math.floor((Date.now() - this.sessionStart) / 1000);
  }

  getEstimatedCostCents(): number {
    // Deepgram: sttSeconds * 0.0043 / 60
    // ElevenLabs: ttsCharacters * 0.000018
    // Claude: (input * 0.003 + output * 0.015) / 1000
    return 0;
  }

  async finalizeSession(sessionId: string): Promise<void> {
    // Update voice_sessions with stats
    // Update voice_usage_limits
    // Check threshold alerts
  }
}
```

### 8. useRealtimeVoice.ts (Client Hook)

```typescript
// components/voice/realtime/useRealtimeVoice.ts
//
// AUDIO CAPTURE:
//   - getUserMedia({ audio: true })
//   - AudioContext at 16kHz
//   - AudioWorkletNode (NOT ScriptProcessorNode)
//   - Chunk size: 4096 samples (~256ms)
//
// AUDIO PLAYBACK:
//   - Decode base64 audio chunks from server
//   - Queue in AudioPlaybackManager for gapless playback
//   - On barge-in: clear queue immediately
//
// VAD: @ricky0123/vad-web (browser-side)
//   - onSpeechStart + onSpeechEnd events
//   - On speech start while AI playing -> send BARGE_IN
//
// iOS SAFARI:
//   - AudioContext MUST be created on user gesture
//   - Call audioContext.resume() after creation
//   - Use AudioWorklet not MediaRecorder

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RealtimeVoiceState, ServerWSMessage } from '@/lib/voice/realtime/types';

export function useRealtimeVoice(personalityId: string) {
  const [state, setState] = useState<RealtimeVoiceState>({
    sessionId: null, status: 'idle', mode: 'call',
    isMuted: false, isSpeakerOn: true,
    isUserSpeaking: false, isAISpeaking: false,
    currentTranscript: '', currentAIText: '',
    durationSeconds: 0, minutesUsed: 0, minutesLimit: 0,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackManagerRef = useRef<any>(null);
  const vadRef = useRef<any>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = useCallback(async (mode: 'call' | 'inline') => {
    // 1. Request mic permission
    // 2. POST /api/voice/realtime/connect -> { sessionId, wsUrl, token }
    // 3. Create AudioContext (user gesture for iOS)
    // 4. Load AudioWorklet processor
    // 5. Connect WebSocket with token
    // 6. Initialize VAD
    // 7. Start sending audio chunks on WS open
    // 8. Start duration counter
    // 9. Update state: connecting -> active on SESSION_READY
  }, [personalityId]);

  const endSession = useCallback(async () => {
    // Send END_SESSION, stop mic, close AudioContext, close WS, clear timers, dispose VAD
  }, []);

  const toggleMute = useCallback(() => { /* stop/resume audio chunks */ }, []);
  const toggleSpeaker = useCallback(() => { /* enable/disable playback */ }, []);

  const handleServerMessage = useCallback((message: ServerWSMessage) => {
    // Handle: SESSION_READY, AUDIO_CHUNK, TRANSCRIPT_USER, TRANSCRIPT_AI,
    // AI_SPEAKING_START/END, BARGE_IN_ACK, USAGE_UPDATE, SESSION_ENDED, ERROR
  }, []);

  useEffect(() => {
    return () => { /* cleanup everything */ };
  }, []);

  return { state, startSession, endSession, toggleMute, toggleSpeaker };
}
```

### 9. VoiceCallScreen.tsx

```typescript
// components/voice/realtime/VoiceCallScreen.tsx
//
// Full-screen phone call UI.
// Dark bg, persona avatar centered, pulse when AI speaking,
// live transcript overlay, timer, bottom controls bar.
// Wake Lock API to prevent screen sleep.
// States: Connecting, Active, AI Speaking, User Speaking, Ending.

'use client';

import { useEffect } from 'react';
import { useRealtimeVoice } from './useRealtimeVoice';
import { VoiceCallControls } from './VoiceCallControls';
import { VoiceVisualizer } from './VoiceVisualizer';

interface VoiceCallScreenProps {
  personalityId: string;
  personaName: string;
  personaImage?: string;
  onClose: () => void;
}

export function VoiceCallScreen({ personalityId, personaName, personaImage, onClose }: VoiceCallScreenProps) {
  const { state, startSession, endSession, toggleMute, toggleSpeaker } = useRealtimeVoice(personalityId);

  useEffect(() => { startSession('call'); }, []);
  // useEffect -> navigator.wakeLock.request('screen')
  // useEffect -> handle back button with confirmation

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between py-12">
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          {state.status === 'connecting' ? 'Calling...' : 'Connected'}
        </p>
        <p className="text-white font-mono text-lg mt-1">
          {/* MM:SS timer */}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          {/* Persona image/initial + VoiceVisualizer pulse ring */}
        </div>
      </div>

      <div className="px-6 mb-8 text-center max-w-md">
        {state.currentAIText && (
          <p className="text-white/60 text-sm">{state.currentAIText}</p>
        )}
      </div>

      <p className="text-white text-xl font-semibold mb-8">{personaName}</p>

      <VoiceCallControls
        isMuted={state.isMuted}
        isSpeakerOn={state.isSpeakerOn}
        onToggleMute={toggleMute}
        onToggleSpeaker={toggleSpeaker}
        onEndCall={() => { endSession(); onClose(); }}
      />

      {state.minutesLimit > 0 && state.minutesUsed / state.minutesLimit > 0.9 && (
        <div className="absolute top-4 left-4 right-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-center">
          <p className="text-red-400 text-sm">
            {Math.floor(state.minutesLimit - state.minutesUsed)} minutes remaining
          </p>
        </div>
      )}
    </div>
  );
}
```

### 10. InlineVoiceMic.tsx

```typescript
// components/voice/realtime/InlineVoiceMic.tsx
//
// Mic button in chat input. On tap starts inline voice session.
// Shows compact bar: [waveform] [status] [mute] [stop]
// Transcripts added to regular chat history.

'use client';

import { useRealtimeVoice } from './useRealtimeVoice';
import { VoiceVisualizer } from './VoiceVisualizer';

interface InlineVoiceMicProps {
  personalityId: string;
  onTranscriptMessage: (role: 'user' | 'assistant', text: string) => void;
  isPremium: boolean;
}

export function InlineVoiceMic({ personalityId, onTranscriptMessage, isPremium }: InlineVoiceMicProps) {
  const { state, startSession, endSession, toggleMute } = useRealtimeVoice(personalityId);

  if (!isPremium) {
    return (
      <button className="p-2 text-gray-500" onClick={() => {/* upgrade prompt */}}>
        {/* Mic icon with lock */}
      </button>
    );
  }

  if (state.status === 'idle') {
    return (
      <button
        className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
        onClick={() => startSession('inline')}
      >
        {/* Mic icon */}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full">
      <VoiceVisualizer isActive={state.isUserSpeaking} size="small" />
      <span className="text-sm text-white/60 flex-1 truncate">
        {state.isUserSpeaking ? 'Listening...' : state.isAISpeaking ? 'Speaking...' : 'Ready'}
      </span>
      <button onClick={toggleMute} className="p-1">{/* mute icon */}</button>
      <button onClick={endSession} className="p-1 text-red-400">{/* stop icon */}</button>
    </div>
  );
}
```

### 11. Connect API Route

```typescript
// app/api/voice/realtime/connect/route.ts
//
// POST — Initiates a voice session. Returns session ID + WS details.
// Checks: auth, premium sub, usage limits, personality voice enabled, no concurrent sessions.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { personalityId, mode } = await request.json();
  if (!personalityId || !['call', 'inline'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // 1. Check premium subscription -> 403 if not premium
  // 2. Check no concurrent sessions -> 409 if active session exists
  // 3. Check voice minutes remaining -> 403 if limit reached
  // 4. Verify personality has realtime_enabled -> 400 if not
  // 5. Load feature flags (VOICE_BARGE_IN_ENABLED, VOICE_MAX_SESSION_MINUTES)
  // 6. Create voice_sessions row status='connecting'
  // 7. Generate short-lived JWT (5min expiry) for WS auth
  // 8. Return { sessionId, wsUrl, token, config }

  return NextResponse.json({
    sessionId: '...',
    wsUrl: `${process.env.NEXT_PUBLIC_WS_URL}`,
    token: '...',
    config: {
      bargeInEnabled: true,
      maxSessionMinutes: 30,
      silenceTimeoutMs: 500,
      vadSensitivity: 0.5,
    }
  });
}
```

### 12. WebSocket Server

```typescript
// server/voice-ws-server.ts
//
// DEPLOYMENT NOTE: Next.js app router does NOT support long-lived WebSockets.
// This MUST run as a separate Node.js process.
//
// Options:
//   A (RECOMMENDED): Separate server on Railway/Fly.io/same VPS
//   B: Next.js custom server with next-ws
//   C: Vercel does NOT support this — must use Option A
//
// Server:
//   1. Accept WS connections with ?token=JWT&sessionId=UUID
//   2. Verify JWT
//   3. Create VoiceSessionManager
//   4. Pipe messages bidirectionally
//   5. Handle disconnects gracefully

// import { WebSocketServer } from 'ws';
// import { VoiceSessionManager } from '../lib/voice/realtime/voice-session-manager';
// import { verifyToken } from '../lib/auth/jwt';
//
// const wss = new WebSocketServer({ port: process.env.WS_PORT || 8080 });
//
// wss.on('connection', async (ws, req) => {
//   const url = new URL(req.url!, `http://${req.headers.host}`);
//   const token = url.searchParams.get('token');
//   const sessionId = url.searchParams.get('sessionId');
//   const payload = verifyToken(token);
//   if (!payload) { ws.close(4001, 'Unauthorized'); return; }
//
//   // Load session, create manager, initialize
//   // ws.on('message', ...) -> manager.handleClientMessage(...)
//   // ws.on('close', ...) -> manager.endSession('disconnected')
// });
```

### 13. Admin Panel Additions

```
Feature flag toggles:

VOICE_REALTIME_ENABLED (master switch)
  OFF: Call buttons hidden, /connect returns 503
  ON: Available to premium users

VOICE_BARGE_IN_ENABLED
  OFF: Turn-based only
  ON: Users can interrupt AI
  DEFAULT: ON
  NOTE: If causing issues, flip OFF first

VOICE_MAX_SESSION_MINUTES (number, default 30)
VOICE_MONTHLY_LIMIT_MINUTES (number, default 60)

Dashboard metrics:
  - Active voice sessions (real-time)
  - Total minutes today
  - Average session duration
  - Average latency
  - Barge-in usage rate
  - API costs (Deepgram + ElevenLabs + Claude)
```

---

## ENVIRONMENT VARIABLES

```env
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=          # already exists
ANTHROPIC_API_KEY=           # already exists
WS_PORT=8080
NEXT_PUBLIC_WS_URL=wss://voice.yourdomain.com
WS_JWT_SECRET=               # openssl rand -hex 32
WS_JWT_EXPIRY=300
```

---

## COST ANALYSIS

Per minute: ~0.03-0.04 GBP
Per user/month (60 mins): ~1.71-2.31 GBP
At 14.99 GBP premium: ~79% gross margin after voice + chat costs

---

## TESTING CHECKLIST

### Security
```
[ ] Unauthenticated -> 401
[ ] Free user -> 403 with upgrade prompt
[ ] Expired JWT rejected at WebSocket
[ ] Cross-user data access blocked by RLS
[ ] Rate limit on session creation
```

### Golden Paths
```
[ ] Premium user -> Call -> speak -> AI voice reply -> end call -> transcript saved
[ ] Premium user -> inline mic -> speak -> AI reply in chat -> stop -> back to text
[ ] Speak -> AI responds -> interrupt (barge-in) -> AI stops -> new speech processed
[ ] Free user -> Call -> upgrade prompt
[ ] 90% limit -> warning -> 100% -> auto-end
[ ] Admin disables barge-in -> turn-based only
[ ] Admin disables voice -> buttons hidden
```

### Platform
```
[ ] iOS Safari: AudioContext on gesture, mic works
[ ] Android Chrome: mic works
[ ] Desktop: both UX modes work
[ ] Wake Lock prevents screen sleep
[ ] Network drop -> graceful end or reconnect
[ ] Latency < 1.5s (end of speech -> start of AI audio)
```

---

## EXIT CRITERIA

```
[ ] DB tables + RLS policies created
[ ] Feature flags in admin panel
[ ] WebSocket server running
[ ] Full pipeline: Deepgram -> Claude -> ElevenLabs -> Client
[ ] Full-screen call UI on mobile + desktop
[ ] Inline mic in existing chat
[ ] Barge-in with admin toggle
[ ] Usage tracking + monthly limits
[ ] Premium gating
[ ] All golden paths passing
[ ] All security tests passing
[ ] iOS Safari working
[ ] Latency < 1.5 seconds
```

---

## KNOWN RISKS

| Risk | Mitigation |
|------|------------|
| High latency (>2s) | Sentence-level TTS batching, tune endpointing, PCM output |
| iOS Safari WS issues | Test early, polling fallback |
| ElevenLabs streaming unstable | Fall back to sentence-level TTS |
| Cost overrun | Strict limits, admin dashboard, alerts |
| WS server scaling | Single instance first, load balance later |
| Barge-in race conditions | Debounce, mutex on pipeline, disable flag |
| Vercel no WS support | Separate server from start |

---

## DEPENDENCIES

```bash
npm install @deepgram/sdk ws jsonwebtoken    # server
npm install @ricky0123/vad-web               # client
```

---

## NOT IN THIS ZIP

- Call recording/playback
- Multi-language voice
- Custom voice cloning from creator audio
- Video avatar during call (looped video idea)
- Group voice calls
- PSTN/phone calling

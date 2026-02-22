'use client';

// ===========================================
// USE REALTIME VOICE HOOK
// Core hook for real-time voice functionality
// ===========================================

import { useState, useRef, useCallback, useEffect } from 'react';

// ===========================================
// TYPES
// ===========================================

export interface RealtimeVoiceState {
  status: 'idle' | 'connecting' | 'active' | 'ending' | 'error';
  sessionId: string | null;
  mode: 'call' | 'inline' | null;
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

interface SessionConfig {
  bargeInEnabled: boolean;
  maxSessionMinutes: number;
  silenceTimeoutMs: number;
  vadSensitivity: number;
}

interface ServerWSMessage {
  type: string;
  [key: string]: unknown;
}

export interface UseRealtimeVoiceOptions {
  personalityId: string;
  onTranscriptUpdate?: (userText: string, aiText: string) => void;
  onSessionEnd?: (durationSeconds: number) => void;
  onError?: (error: string) => void;
}

export interface UseRealtimeVoiceReturn {
  state: RealtimeVoiceState;
  startCall: (mode: 'call' | 'inline') => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  triggerBargeIn: () => void;
}

// Audio constraints
const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
};

// ===========================================
// HOOK IMPLEMENTATION
// ===========================================

export function useRealtimeVoice(
  options: UseRealtimeVoiceOptions
): UseRealtimeVoiceReturn {
  const { personalityId, onTranscriptUpdate, onSessionEnd, onError } = options;

  // State
  const [state, setState] = useState<RealtimeVoiceState>({
    status: 'idle',
    sessionId: null,
    mode: null,
    isMuted: false,
    isSpeakerOn: true,
    isUserSpeaking: false,
    isAISpeaking: false,
    currentTranscript: '',
    currentAIText: '',
    durationSeconds: 0,
    minutesUsed: 0,
    minutesLimit: 60,
    error: null,
  });

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<SessionConfig | null>(null);

  // ===========================================
  // AUDIO PLAYBACK
  // ===========================================

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const base64Audio = audioQueueRef.current.shift();
      if (!base64Audio) continue;

      try {
        // Decode base64 to array buffer
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Use HTML5 Audio with iOS-specific settings
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        // iOS-specific attributes for loudspeaker playback
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        audio.volume = 1.0;
        audio.muted = false;

        // Force speaker output on iOS by setting these properties
        (audio as any).mozAudioChannelType = 'content';
        (audio as any).webkitAudioDecodedByteCount = 0;

        console.log('[Voice] Playing audio, blob size:', blob.size);

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            console.log('[Voice] Audio ended');
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            console.warn('[Voice] Audio error');
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.play().then(() => {
            console.log('[Voice] play() started, duration:', audio.duration);
          }).catch((err) => {
            console.warn('[Voice] play() failed:', err.message);
            URL.revokeObjectURL(url);
            resolve();
          });
        });
      } catch (error) {
        console.warn('[Voice] Audio playback error:', error);
      }
    }

    isPlayingRef.current = false;
  }, []);

  // ===========================================
  // WEBSOCKET MESSAGE HANDLERS
  // ===========================================

  const handleWSMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ServerWSMessage = JSON.parse(event.data);

      // Debug: log all incoming messages
      console.log('[Voice] WS message:', message.type, message.type === 'AUDIO_CHUNK' ? `(${(message.data as string)?.length} bytes)` : '');

      switch (message.type) {
        case 'SESSION_READY':
          configRef.current = message.config as SessionConfig;
          setState((prev) => ({
            ...prev,
            status: 'active',
            sessionId: message.sessionId as string,
          }));
          break;

        case 'AUDIO_CHUNK':
          console.log('[Voice] Received AUDIO_CHUNK, queue size before:', audioQueueRef.current.length);
          audioQueueRef.current.push(message.data as string);
          console.log('[Voice] Queue size after:', audioQueueRef.current.length, 'calling playAudioQueue');
          playAudioQueue();
          break;

        case 'TRANSCRIPT_USER':
          setState((prev) => ({
            ...prev,
            currentTranscript: message.text as string,
            isUserSpeaking: !(message.isFinal as boolean),
          }));
          break;

        case 'TRANSCRIPT_AI':
          setState((prev) => ({
            ...prev,
            currentAIText: message.text as string,
          }));
          if (message.isFinal) {
            onTranscriptUpdate?.(
              state.currentTranscript,
              message.text as string
            );
          }
          break;

        case 'AI_SPEAKING_START':
          setState((prev) => ({ ...prev, isAISpeaking: true }));
          break;

        case 'AI_SPEAKING_END':
          setState((prev) => ({ ...prev, isAISpeaking: false }));
          break;

        case 'BARGE_IN_ACK':
          // Clear audio queue on barge-in
          audioQueueRef.current = [];
          break;

        case 'USAGE_UPDATE':
          setState((prev) => ({
            ...prev,
            minutesUsed: message.minutesUsed as number,
            minutesLimit: message.minutesLimit as number,
          }));
          break;

        case 'SESSION_ENDED':
          setState((prev) => ({
            ...prev,
            status: 'idle',
            sessionId: null,
          }));
          onSessionEnd?.(message.duration as number);
          break;

        case 'ERROR':
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: message.message as string,
          }));
          onError?.(message.message as string);
          break;

        case 'PONG':
          // Heartbeat response, no action needed
          break;

        default:
          console.log('[Voice] Unknown message:', message.type);
      }
    } catch (error) {
      console.error('[Voice] Message parse error:', error);
    }
  }, [state.currentTranscript, onTranscriptUpdate, onSessionEnd, onError, playAudioQueue]);

  // ===========================================
  // AUDIO CAPTURE
  // ===========================================

  const startAudioCapture = useCallback(async () => {
    try {
      // iOS audio unlock - play silent audio to enable speaker output
      // This must happen during a user gesture
      const unlockAudio = new Audio();
      unlockAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAbD/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+M4wAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      unlockAudio.volume = 0.01;
      unlockAudio.muted = false;
      unlockAudio.setAttribute('playsinline', 'true');
      try {
        await unlockAudio.play();
        console.log('[Voice] iOS audio unlocked');
      } catch {
        console.log('[Voice] iOS audio unlock not needed');
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      mediaStreamRef.current = stream;

      // Create audio context (must be on user gesture for iOS)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      // Resume if suspended (iOS)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create source from microphone
      const source = audioContext.createMediaStreamSource(stream);

      // Use ScriptProcessorNode (deprecated but widely supported)
      // TODO: Migrate to AudioWorkletNode for better performance
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (state.isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert float32 to int16
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const uint8Array = new Uint8Array(int16Data.buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        // Send to WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'AUDIO_CHUNK',
              data: base64,
              timestamp: Date.now(),
            })
          );
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log('[Voice] Audio capture started');
    } catch (error) {
      console.error('[Voice] Audio capture error:', error);
      throw new Error('Failed to access microphone');
    }
  }, [state.isMuted]);

  const stopAudioCapture = useCallback(() => {
    // Stop processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    console.log('[Voice] Audio capture stopped');
  }, []);

  // ===========================================
  // CALL CONTROL
  // ===========================================

  const startCall = useCallback(async (mode: 'call' | 'inline') => {
    try {
      setState((prev) => ({
        ...prev,
        status: 'connecting',
        mode,
        error: null,
        currentTranscript: '',
        currentAIText: '',
        durationSeconds: 0,
      }));

      // Request connection from API
      const response = await fetch('/api/voice/realtime/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalityId, mode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect');
      }

      const { sessionId, wsUrl, token, config } = await response.json();

      // Start audio capture first (user gesture)
      await startAudioCapture();

      // Connect WebSocket
      const ws = new WebSocket(`${wsUrl}?token=${token}`);
      wsRef.current = ws;
      configRef.current = config;

      ws.onopen = () => {
        console.log('[Voice] WebSocket connected');
      };

      ws.onmessage = handleWSMessage;

      ws.onclose = (event) => {
        console.log('[Voice] WebSocket closed:', event.code);
        stopAudioCapture();
        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current);
        }
        if (state.status === 'active') {
          setState((prev) => ({
            ...prev,
            status: 'idle',
            sessionId: null,
          }));
        }
      };

      ws.onerror = (error) => {
        console.error('[Voice] WebSocket error:', error);
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Connection error',
        }));
      };

      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          durationSeconds: prev.durationSeconds + 1,
        }));
      }, 1000);

      setState((prev) => ({
        ...prev,
        sessionId,
        minutesUsed: config.minutesUsed || 0,
        minutesLimit: config.minutesLimit || 60,
      }));
    } catch (error) {
      console.error('[Voice] Start call error:', error);
      stopAudioCapture();
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to start call',
      }));
      onError?.(error instanceof Error ? error.message : 'Failed to start call');
    }
  }, [personalityId, startAudioCapture, stopAudioCapture, handleWSMessage, onError, state.status]);

  const endCall = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'ending' }));

    // Send end session message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'END_SESSION',
          reason: 'user_ended',
        })
      );
      wsRef.current.close(1000, 'User ended call');
    }

    // Clean up
    stopAudioCapture();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
    audioQueueRef.current = [];

    setState((prev) => ({
      ...prev,
      status: 'idle',
      sessionId: null,
      mode: null,
      isUserSpeaking: false,
      isAISpeaking: false,
    }));
  }, [stopAudioCapture]);

  const toggleMute = useCallback(() => {
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleSpeaker = useCallback(() => {
    setState((prev) => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
  }, []);

  const triggerBargeIn = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && state.isAISpeaking) {
      wsRef.current.send(
        JSON.stringify({
          type: 'BARGE_IN',
          timestamp: Date.now(),
        })
      );
      // Clear local audio queue immediately
      audioQueueRef.current = [];
    }
  }, [state.isAISpeaking]);

  // ===========================================
  // CLEANUP
  // ===========================================

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopAudioCapture();
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [stopAudioCapture]);

  // ===========================================
  // RETURN
  // ===========================================

  return {
    state,
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    triggerBargeIn,
  };
}

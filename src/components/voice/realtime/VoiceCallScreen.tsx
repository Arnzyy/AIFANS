'use client';

// ===========================================
// VOICE CALL SCREEN
// Full-screen phone call UI
// ===========================================

import { useEffect } from 'react';
import { useRealtimeVoice, type RealtimeVoiceState } from './useRealtimeVoice';
import { VoiceCallControls } from './VoiceCallControls';
import { VoiceVisualizer } from './VoiceVisualizer';

interface VoiceCallScreenProps {
  personalityId: string;
  personalityName: string;
  personalityAvatar?: string;
  onClose: () => void;
}

export function VoiceCallScreen({
  personalityId,
  personalityName,
  personalityAvatar,
  onClose,
}: VoiceCallScreenProps) {
  const {
    state,
    startCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    triggerBargeIn,
  } = useRealtimeVoice({
    personalityId,
    onSessionEnd: (duration) => {
      console.log('[VoiceCall] Session ended, duration:', duration);
      setTimeout(onClose, 1500);
    },
    onError: (error) => {
      console.error('[VoiceCall] Error:', error);
    },
  });

  // Start call on mount
  useEffect(() => {
    startCall('call');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle end call
  const handleEndCall = () => {
    endCall();
    onClose();
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="text-sm text-gray-400">
          {formatDuration(state.durationSeconds)}
        </div>
        <div className="text-sm text-gray-400">
          {state.minutesUsed} / {state.minutesLimit} min
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Avatar */}
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
            {personalityAvatar ? (
              <img
                src={personalityAvatar}
                alt={personalityName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl font-bold text-white">
                {personalityName.charAt(0)}
              </span>
            )}
          </div>

          {/* Speaking indicator ring */}
          {state.isAISpeaking && (
            <div className="absolute inset-0 -m-2 rounded-full border-4 border-purple-400 animate-pulse" />
          )}
        </div>

        {/* Name */}
        <h2 className="text-2xl font-bold text-white mb-2">{personalityName}</h2>

        {/* Status */}
        <div className="text-gray-400 mb-8">
          <CallStatus status={state.status} isAISpeaking={state.isAISpeaking} />
        </div>

        {/* Visualizer */}
        <div className="mb-8">
          <VoiceVisualizer
            isUserSpeaking={state.isUserSpeaking}
            isAISpeaking={state.isAISpeaking}
          />
        </div>

        {/* Transcript */}
        <div className="w-full max-w-md space-y-4 text-center">
          {state.currentTranscript && (
            <div className="p-4 bg-black/70 backdrop-blur-md rounded-xl border border-white/20">
              <p className="text-sm text-gray-400 mb-1">You</p>
              <p className="text-white font-medium">{state.currentTranscript}</p>
            </div>
          )}
          {state.currentAIText && (
            <div className="p-4 bg-purple-900/80 backdrop-blur-md rounded-xl border border-purple-400/30">
              <p className="text-sm text-purple-300 mb-1">{personalityName}</p>
              <p className="text-white font-medium">{state.currentAIText}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {state.error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
            {state.error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6">
        <VoiceCallControls
          isMuted={state.isMuted}
          isSpeakerOn={state.isSpeakerOn}
          isAISpeaking={state.isAISpeaking}
          isConnecting={state.status === 'connecting'}
          onToggleMute={toggleMute}
          onToggleSpeaker={toggleSpeaker}
          onBargeIn={triggerBargeIn}
          onEndCall={handleEndCall}
        />
      </div>
    </div>
  );
}

// Call status display
function CallStatus({
  status,
  isAISpeaking,
}: {
  status: RealtimeVoiceState['status'];
  isAISpeaking: boolean;
}) {
  switch (status) {
    case 'connecting':
      return (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          Connecting...
        </span>
      );
    case 'active':
      if (isAISpeaking) {
        return (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            Speaking...
          </span>
        );
      }
      return (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          Connected
        </span>
      );
    case 'ending':
      return <span>Ending call...</span>;
    case 'error':
      return (
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-400 rounded-full" />
          Connection error
        </span>
      );
    default:
      return null;
  }
}

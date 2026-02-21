'use client';

// ===========================================
// INLINE VOICE MIC
// Mic button for chat interface
// ===========================================

import { useState } from 'react';
import { Phone, X, Mic, MicOff } from 'lucide-react';
import { useRealtimeVoice } from './useRealtimeVoice';

interface InlineVoiceMicProps {
  personalityId: string;
  personalityName: string;
  isPremium: boolean;
  isVoiceEnabled: boolean;
  onTranscript?: (userText: string, aiText: string) => void;
  onOpenFullScreen?: () => void;
}

export function InlineVoiceMic({
  personalityId,
  personalityName,
  isPremium,
  isVoiceEnabled,
  onTranscript,
  onOpenFullScreen,
}: InlineVoiceMicProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const { state, startCall, endCall, toggleMute } = useRealtimeVoice({
    personalityId,
    onTranscriptUpdate: onTranscript,
  });

  const isActive = state.status === 'active' || state.status === 'connecting';

  // Handle click
  const handleClick = () => {
    if (!isPremium) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    if (!isVoiceEnabled) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    if (isActive) {
      endCall();
    } else {
      // Start inline mode or open full screen
      if (onOpenFullScreen) {
        onOpenFullScreen();
      } else {
        startCall('inline');
      }
    }
  };

  // Don't show if voice is completely disabled
  if (!isVoiceEnabled && !isPremium) {
    return null;
  }

  return (
    <div className="relative">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="px-3 py-2 bg-gray-800 rounded-lg text-sm text-white shadow-lg">
            {!isPremium
              ? 'Voice calls require premium subscription'
              : 'Voice is not enabled for this creator'}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
          </div>
        </div>
      )}

      {/* Main button */}
      <button
        onClick={handleClick}
        disabled={state.status === 'connecting'}
        className={`
          relative p-2.5 rounded-full transition-all
          ${isActive
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : isPremium && isVoiceEnabled
            ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
          }
        `}
        title={
          !isPremium
            ? 'Premium required'
            : !isVoiceEnabled
            ? 'Voice not enabled'
            : isActive
            ? 'End call'
            : 'Start voice call'
        }
      >
        {isActive ? (
          state.isMuted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Phone className="w-5 h-5" />
          )
        ) : (
          <Phone className="w-5 h-5" />
        )}

        {/* Active indicator */}
        {isActive && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse" />
        )}

        {/* Connecting spinner */}
        {state.status === 'connecting' && (
          <span className="absolute inset-0 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
        )}
      </button>

      {/* Inline mini controls when active */}
      {isActive && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-full shadow-lg">
            {/* Duration */}
            <span className="text-xs text-gray-400">
              {Math.floor(state.durationSeconds / 60)}:
              {(state.durationSeconds % 60).toString().padStart(2, '0')}
            </span>

            {/* Mute toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className={`p-1.5 rounded-full ${
                state.isMuted
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-white/10 text-white'
              }`}
            >
              {state.isMuted ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* End button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                endCall();
              }}
              className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Speaking indicators */}
            {state.isUserSpeaking && (
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
            {state.isAISpeaking && (
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

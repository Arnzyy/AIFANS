'use client';

// ===========================================
// VOICE CALL CONTROLS
// Mute, speaker, end call buttons
// ===========================================

import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Hand } from 'lucide-react';

interface VoiceCallControlsProps {
  isMuted: boolean;
  isSpeakerOn: boolean;
  isAISpeaking: boolean;
  isConnecting: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onBargeIn: () => void;
  onEndCall: () => void;
}

export function VoiceCallControls({
  isMuted,
  isSpeakerOn,
  isAISpeaking,
  isConnecting,
  onToggleMute,
  onToggleSpeaker,
  onBargeIn,
  onEndCall,
}: VoiceCallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Mute button */}
      <button
        onClick={onToggleMute}
        disabled={isConnecting}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center transition-all
          ${isMuted
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-white/10 text-white hover:bg-white/20'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>

      {/* Speaker button */}
      <button
        onClick={onToggleSpeaker}
        disabled={isConnecting}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center transition-all
          ${!isSpeakerOn
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            : 'bg-white/10 text-white hover:bg-white/20'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
      >
        {isSpeakerOn ? (
          <Volume2 className="w-6 h-6" />
        ) : (
          <VolumeX className="w-6 h-6" />
        )}
      </button>

      {/* Barge-in / interrupt button */}
      <button
        onClick={onBargeIn}
        disabled={isConnecting || !isAISpeaking}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center transition-all
          ${isAISpeaking
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
            : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }
        `}
        aria-label="Interrupt"
        title="Tap to interrupt"
      >
        <Hand className="w-6 h-6" />
      </button>

      {/* End call button */}
      <button
        onClick={onEndCall}
        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/30"
        aria-label="End call"
      >
        <PhoneOff className="w-7 h-7" />
      </button>
    </div>
  );
}

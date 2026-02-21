'use client';

// ===========================================
// VOICE VISUALIZER
// Audio waveform/pulse animation
// ===========================================

import { useEffect, useState } from 'react';

interface VoiceVisualizerProps {
  isUserSpeaking: boolean;
  isAISpeaking: boolean;
}

export function VoiceVisualizer({
  isUserSpeaking,
  isAISpeaking,
}: VoiceVisualizerProps) {
  const [bars, setBars] = useState<number[]>([0.3, 0.5, 0.7, 0.5, 0.3]);

  // Animate bars when speaking
  useEffect(() => {
    if (!isUserSpeaking && !isAISpeaking) {
      setBars([0.2, 0.3, 0.4, 0.3, 0.2]);
      return;
    }

    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map(() => {
          const base = isUserSpeaking ? 0.5 : 0.4;
          const variance = isUserSpeaking ? 0.5 : 0.4;
          return base + Math.random() * variance;
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isUserSpeaking, isAISpeaking]);

  const color = isUserSpeaking
    ? 'bg-green-400'
    : isAISpeaking
    ? 'bg-purple-400'
    : 'bg-gray-500';

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((height, index) => (
        <div
          key={index}
          className={`w-1.5 rounded-full transition-all duration-100 ${color}`}
          style={{
            height: `${height * 64}px`,
            opacity: isUserSpeaking || isAISpeaking ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

// Alternative circular pulsing visualizer
export function VoiceVisualizerCircle({
  isUserSpeaking,
  isAISpeaking,
}: VoiceVisualizerProps) {
  const isActive = isUserSpeaking || isAISpeaking;
  const color = isUserSpeaking
    ? 'from-green-400 to-green-600'
    : 'from-purple-400 to-purple-600';

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Outer ring - pulses when active */}
      <div
        className={`
          absolute inset-0 rounded-full bg-gradient-to-br ${color} opacity-20
          transition-all duration-300
          ${isActive ? 'scale-110 animate-pulse' : 'scale-100'}
        `}
      />

      {/* Middle ring */}
      <div
        className={`
          absolute inset-4 rounded-full bg-gradient-to-br ${color} opacity-30
          transition-all duration-300 delay-75
          ${isActive ? 'scale-110' : 'scale-100'}
        `}
      />

      {/* Inner circle */}
      <div
        className={`
          absolute inset-8 rounded-full bg-gradient-to-br ${color}
          transition-all duration-300 delay-150
          ${isActive ? 'scale-105' : 'scale-100'}
        `}
      />

      {/* Center icon or status */}
      <div className="relative z-10 text-white font-semibold text-sm">
        {isUserSpeaking ? 'You' : isAISpeaking ? 'AI' : '...'}
      </div>
    </div>
  );
}

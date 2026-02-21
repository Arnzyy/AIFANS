'use client';

// ===========================================
// VOICE LIBRARY PICKER
// Grid of voices with preview playback
// ===========================================

import { useState, useEffect, useRef } from 'react';
import type { VoiceLibraryEntry, VoiceGender, VoiceAgeRange } from '@/lib/voice/types';

interface VoiceLibraryPickerProps {
  selectedVoiceId: string | null;
  onChange: (voiceId: string) => void;
  disabled?: boolean;
}

export function VoiceLibraryPicker({
  selectedVoiceId,
  onChange,
  disabled = false,
}: VoiceLibraryPickerProps) {
  const [voices, setVoices] = useState<VoiceLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  // Filters
  const [genderFilter, setGenderFilter] = useState<VoiceGender | ''>('');
  const [ageFilter, setAgeFilter] = useState<VoiceAgeRange | ''>('');
  const [accentFilter, setAccentFilter] = useState<string>('');
  const [accents, setAccents] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch voices
  useEffect(() => {
    async function fetchVoices() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (genderFilter) params.set('gender', genderFilter);
        if (ageFilter) params.set('age_range', ageFilter);
        if (accentFilter) params.set('accent', accentFilter);
        params.set('include_accents', 'true');

        const res = await fetch(`/api/voice/library?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch voices');

        const data = await res.json();
        setVoices(data.voices);
        if (data.accents) setAccents(data.accents);
        setError(null);
      } catch (err) {
        console.error('Error fetching voices:', err);
        setError('Failed to load voices');
      } finally {
        setLoading(false);
      }
    }

    fetchVoices();
  }, [genderFilter, ageFilter, accentFilter]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play voice preview
  const playPreview = async (voice: VoiceLibraryEntry) => {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // If clicking the same voice, just stop
    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      return;
    }

    try {
      setPreviewLoading(voice.id);

      const res = await fetch('/api/voice/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voice.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate preview');
      }

      const data = await res.json();

      // Create and play audio
      const audio = new Audio(data.audio_url);
      audioRef.current = audio;
      setPlayingVoiceId(voice.id);

      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error('Preview error:', err);
      setPlayingVoiceId(null);
    } finally {
      setPreviewLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-purple-500/20 rounded-lg hover:bg-purple-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value as VoiceGender | '')}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
          disabled={disabled}
        >
          <option value="">All Genders</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="neutral">Neutral</option>
        </select>

        <select
          value={ageFilter}
          onChange={(e) => setAgeFilter(e.target.value as VoiceAgeRange | '')}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
          disabled={disabled}
        >
          <option value="">All Ages</option>
          <option value="young">Young</option>
          <option value="middle">Middle</option>
          <option value="mature">Mature</option>
        </select>

        {accents.length > 0 && (
          <select
            value={accentFilter}
            onChange={(e) => setAccentFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-purple-500 focus:outline-none"
            disabled={disabled}
          >
            <option value="">All Accents</option>
            {accents.map((accent) => (
              <option key={accent} value={accent}>
                {accent.charAt(0).toUpperCase() + accent.slice(1)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Voice Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {voices.map((voice) => {
          const isSelected = selectedVoiceId === voice.id;
          const isPlaying = playingVoiceId === voice.id;
          const isLoadingPreview = previewLoading === voice.id;

          return (
            <button
              key={voice.id}
              onClick={() => onChange(voice.id)}
              disabled={disabled}
              className={`
                relative p-4 rounded-xl border text-left transition-all
                ${isSelected
                  ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/50'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg
                    className="w-5 h-5 text-purple-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {/* Voice info */}
              <div className="pr-6">
                <h3 className="font-medium text-white">{voice.name}</h3>
                {voice.description && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {voice.description}
                  </p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {voice.gender && (
                    <span className="px-2 py-0.5 text-xs bg-white/10 rounded-full">
                      {voice.gender}
                    </span>
                  )}
                  {voice.age_range && (
                    <span className="px-2 py-0.5 text-xs bg-white/10 rounded-full">
                      {voice.age_range}
                    </span>
                  )}
                  {voice.accent && voice.accent !== 'neutral' && (
                    <span className="px-2 py-0.5 text-xs bg-white/10 rounded-full">
                      {voice.accent}
                    </span>
                  )}
                  {voice.is_premium && (
                    <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 rounded-full">
                      Premium
                    </span>
                  )}
                </div>
              </div>

              {/* Preview button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playPreview(voice);
                }}
                disabled={disabled || isLoadingPreview}
                className={`
                  mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                  ${isPlaying
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                  }
                  ${(disabled || isLoadingPreview) ? 'opacity-50' : ''}
                `}
              >
                {isLoadingPreview ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {isPlaying ? 'Stop' : 'Preview'}
              </button>
            </button>
          );
        })}
      </div>

      {voices.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>No voices found matching your filters.</p>
        </div>
      )}
    </div>
  );
}

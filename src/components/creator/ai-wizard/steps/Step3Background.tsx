'use client';

import { AIPersonalityFull } from '@/lib/ai/personality/types';
import {
  OCCUPATIONS,
  INTERESTS,
  MUSIC_TASTES,
} from '@/lib/ai/personality/options';

interface Step3Props {
  personality: AIPersonalityFull;
  onChange: (updates: Partial<AIPersonalityFull>) => void;
}

export function Step3Background({ personality, onChange }: Step3Props) {
  const toggleInterest = (interest: string) => {
    const current = personality.interests;
    if (current.includes(interest)) {
      onChange({ interests: current.filter(i => i !== interest) });
    } else if (current.length < 10) {
      onChange({ interests: [...current, interest] });
    }
  };

  const toggleMusic = (genre: string) => {
    const current = personality.music_taste;
    if (current.includes(genre)) {
      onChange({ music_taste: current.filter(m => m !== genre) });
    } else if (current.length < 5) {
      onChange({ music_taste: [...current, genre] });
    }
  };

  return (
    <div className="space-y-8">
      {/* Backstory */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Backstory (optional)
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Give her depth. What shaped her? Keep it fictional - no real places.
        </p>
        <textarea
          value={personality.backstory || ''}
          onChange={(e) => onChange({ backstory: e.target.value })}
          rows={4}
          placeholder="e.g., She grew up loving art and fashion, always the creative one. Now she spends her nights creating and connecting with people who appreciate beauty..."
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 resize-none text-base"
        />
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Backstories work best when they describe your persona — not the relationship with the fan
        </p>
      </div>

      {/* Occupation */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          What does she &quot;do&quot;?
        </label>
        <div className="flex flex-wrap gap-2">
          {OCCUPATIONS.map((job) => (
            <button
              key={job}
              onClick={() => onChange({ occupation: job })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                personality.occupation === job
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {job}
            </button>
          ))}
        </div>
        {/* Custom occupation */}
        <div className="mt-3">
          <input
            type="text"
            value={OCCUPATIONS.includes(personality.occupation) ? '' : personality.occupation}
            onChange={(e) => onChange({ occupation: e.target.value })}
            placeholder="Or type a custom one..."
            className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 text-base"
          />
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Interests & Hobbies
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Pick up to 10. Selected: {personality.interests.length}/10
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                personality.interests.includes(interest)
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Music Taste */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Music She Loves
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Pick up to 5. Selected: {personality.music_taste.length}/5
        </p>
        <div className="flex flex-wrap gap-2">
          {MUSIC_TASTES.map((genre) => (
            <button
              key={genre}
              onClick={() => toggleMusic(genre)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                personality.music_taste.includes(genre)
                  ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              🎵 {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Guilty Pleasures */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Guilty Pleasures (optional)
        </label>
        <input
          type="text"
          value={personality.guilty_pleasures || ''}
          onChange={(e) => onChange({ guilty_pleasures: e.target.value })}
          placeholder="e.g., Reality TV, cheap wine, bad horror movies, 3am snacks..."
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 text-base"
        />
        <p className="text-xs text-gray-500 mt-2">
          These quirks make her relatable and human
        </p>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="text-sm text-gray-400 mb-2">Her world:</div>
        <p className="text-white text-sm">
          {personality.persona_name || 'She'} is a{' '}
          <span className="text-purple-400">{personality.occupation || '...'}</span>
          {personality.interests.length > 0 && (
            <>
              {' '}who loves{' '}
              <span className="text-pink-400">
                {personality.interests.slice(0, 3).join(', ')}
              </span>
            </>
          )}
          {personality.music_taste.length > 0 && (
            <>
              . Her playlist is full of{' '}
              <span className="text-blue-400">
                {personality.music_taste.join(' & ')}
              </span>
            </>
          )}
          .
        </p>
      </div>
    </div>
  );
}

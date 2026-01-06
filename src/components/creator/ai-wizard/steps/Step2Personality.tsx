'use client';

import { AIPersonalityFull } from '@/lib/ai/personality/types';
import {
  PERSONALITY_TRAITS,
  HUMOR_STYLES,
  INTELLIGENCE_VIBES,
  MOODS,
} from '@/lib/ai/personality/options';

interface Step2Props {
  personality: AIPersonalityFull;
  onChange: (updates: Partial<AIPersonalityFull>) => void;
}

export function Step2Personality({ personality, onChange }: Step2Props) {
  const toggleTrait = (traitId: string) => {
    const current = personality.personality_traits;
    if (current.includes(traitId)) {
      onChange({ personality_traits: current.filter(t => t !== traitId) });
    } else if (current.length < 5) {
      onChange({ personality_traits: [...current, traitId] });
    }
  };

  return (
    <div className="space-y-8">
      {/* Personality Traits */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Core Personality Traits *
        </label>
        <p className="text-xs text-gray-500 mb-4">
          Pick 3-5 traits that define her. Selected: {personality.personality_traits.length}/5
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PERSONALITY_TRAITS.map((trait) => (
            <button
              key={trait.id}
              onClick={() => toggleTrait(trait.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                personality.personality_traits.includes(trait.id)
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="text-xl mb-1">{trait.icon}</div>
              <div className="text-sm font-medium">{trait.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Energy Level */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Energy Level
        </label>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm w-16">Chill</span>
          <input
            type="range"
            min={1}
            max={10}
            value={personality.energy_level}
            onChange={(e) => onChange({ energy_level: parseInt(e.target.value) })}
            className="flex-1 accent-purple-500"
          />
          <span className="text-gray-500 text-sm w-20 text-right">High Energy</span>
        </div>
        <div className="text-center mt-2">
          <span className="text-purple-400 font-medium">
            {personality.energy_level <= 3 ? '😌 Calm & Chill' :
             personality.energy_level <= 6 ? '😊 Balanced' :
             '⚡ High Energy!'}
          </span>
        </div>
      </div>

      {/* Humor Style */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Humor Style
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HUMOR_STYLES.map((humor) => (
            <button
              key={humor.id}
              onClick={() => onChange({ humor_style: humor.id as AIPersonalityFull['humor_style'] })}
              className={`p-4 rounded-xl border text-left transition-all ${
                personality.humor_style === humor.id
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="font-medium mb-1">{humor.label}</div>
              <div className="text-xs text-gray-500">{humor.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Intelligence Vibe */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Intelligence Vibe
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INTELLIGENCE_VIBES.map((intel) => (
            <button
              key={intel.id}
              onClick={() => onChange({ intelligence_vibe: intel.id as AIPersonalityFull['intelligence_vibe'] })}
              className={`p-4 rounded-xl border text-left transition-all ${
                personality.intelligence_vibe === intel.id
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="font-medium mb-1">{intel.label}</div>
              <div className="text-xs text-gray-500">{intel.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          General Mood
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              onClick={() => onChange({ mood: mood.id as AIPersonalityFull['mood'] })}
              className={`p-4 rounded-xl border text-center transition-all ${
                personality.mood === mood.id
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="font-medium mb-1">{mood.label}</div>
              <div className="text-xs text-gray-500">{mood.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Preview Box */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="text-sm text-gray-400 mb-2">Preview:</div>
        <p className="text-white">
          {personality.persona_name || 'She'} is{' '}
          <span className="text-purple-400">
            {personality.personality_traits.slice(0, 3).join(', ') || 'unique'}
          </span>
          {' '}with a{' '}
          <span className="text-pink-400">
            {HUMOR_STYLES.find(h => h.id === personality.humor_style)?.label.toLowerCase() || 'fun'}
          </span>
          {' '}sense of humor.
        </p>
      </div>
    </div>
  );
}

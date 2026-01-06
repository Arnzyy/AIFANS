'use client';

import { AIPersonalityFull } from '@/lib/ai/personality/types';
import {
  BODY_TYPES,
  HAIR_COLORS,
  HAIR_STYLES,
  EYE_COLORS,
  SKIN_TONES,
  STYLE_VIBES,
} from '@/lib/ai/personality/options';

interface Step1Props {
  personality: AIPersonalityFull;
  onChange: (updates: Partial<AIPersonalityFull>) => void;
}

export function Step1Identity({ personality, onChange }: Step1Props) {
  const toggleStyleVibe = (vibe: string) => {
    const current = personality.style_vibes;
    if (current.includes(vibe)) {
      onChange({ style_vibes: current.filter(v => v !== vibe) });
    } else if (current.length < 5) {
      onChange({ style_vibes: [...current, vibe] });
    }
  };

  return (
    <div className="space-y-8">
      {/* Name & Age */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Persona Name *
          </label>
          <input
            type="text"
            value={personality.persona_name}
            onChange={(e) => onChange({ persona_name: e.target.value })}
            placeholder="e.g., Luna, Sofia, Aria..."
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Age *
          </label>
          <input
            type="number"
            min={18}
            max={50}
            value={personality.age}
            onChange={(e) => onChange({ age: parseInt(e.target.value) || 18 })}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white text-base"
          />
          <p className="text-xs text-gray-500 mt-1">Must be 18+</p>
        </div>
      </div>

      {/* Height */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Height: {Math.floor(personality.height_cm / 30.48)}&apos;{Math.round((personality.height_cm % 30.48) / 2.54)}&quot; ({personality.height_cm}cm)
        </label>
        <input
          type="range"
          min={150}
          max={185}
          value={personality.height_cm}
          onChange={(e) => onChange({ height_cm: parseInt(e.target.value) })}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>4&apos;11&quot;</span>
          <span>6&apos;1&quot;</span>
        </div>
      </div>

      {/* Body Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Body Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {BODY_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => onChange({ body_type: type.id as AIPersonalityFull['body_type'] })}
              className={`p-4 rounded-xl border text-center transition-all ${
                personality.body_type === type.id
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="text-2xl mb-1">{type.icon}</div>
              <div className="text-sm font-medium">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hair */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hair Color
          </label>
          <select
            value={personality.hair_color}
            onChange={(e) => onChange({ hair_color: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white text-base"
          >
            {HAIR_COLORS.map((color) => (
              <option key={color} value={color} className="bg-zinc-900 text-white">
                {color}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hair Style
          </label>
          <select
            value={personality.hair_style}
            onChange={(e) => onChange({ hair_style: e.target.value })}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white text-base"
          >
            {HAIR_STYLES.map((style) => (
              <option key={style} value={style} className="bg-zinc-900 text-white">
                {style}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Eyes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Eye Color
        </label>
        <div className="flex flex-wrap gap-2">
          {EYE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ eye_color: color })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                personality.eye_color === color
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Skin Tone */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Skin Tone
        </label>
        <div className="flex gap-4">
          {SKIN_TONES.map((tone) => (
            <button
              key={tone.id}
              onClick={() => onChange({ skin_tone: tone.id as AIPersonalityFull['skin_tone'] })}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                personality.skin_tone === tone.id
                  ? 'bg-purple-500/20 border-purple-500'
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full border-2 border-white/20"
                style={{ backgroundColor: tone.color }}
              />
              <span className="text-sm">{tone.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Vibes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Style Vibes (pick up to 5)
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Selected: {personality.style_vibes.length}/5
        </p>
        <div className="flex flex-wrap gap-2">
          {STYLE_VIBES.map((vibe) => (
            <button
              key={vibe}
              onClick={() => toggleStyleVibe(vibe)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                personality.style_vibes.includes(vibe)
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {vibe}
            </button>
          ))}
        </div>
      </div>

      {/* Distinguishing Features */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Distinguishing Features (optional)
        </label>
        <input
          type="text"
          value={personality.distinguishing_features || ''}
          onChange={(e) => onChange({ distinguishing_features: e.target.value })}
          placeholder="e.g., Small tattoo on wrist, nose piercing, beauty mark..."
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 text-base"
        />
      </div>
    </div>
  );
}

'use client';

import { AIPersonalityFull } from '@/lib/ai/personality/types';
import {
  FLIRTING_STYLES,
  DYNAMICS,
  ATTRACTED_TO,
  LOVE_LANGUAGES,
  VIBES_CREATES,
  TURN_ONS,
} from '@/lib/ai/personality/options';

interface Step4Props {
  personality: AIPersonalityFull;
  onChange: (updates: Partial<AIPersonalityFull>) => void;
}

export function Step4Romantic({ personality, onChange }: Step4Props) {
  const toggleFlirtStyle = (style: string) => {
    const current = personality.flirting_style;
    if (current.includes(style)) {
      onChange({ flirting_style: current.filter(s => s !== style) });
    } else if (current.length < 2) {
      onChange({ flirting_style: [...current, style] });
    }
  };

  const toggleAttractedTo = (attr: string) => {
    const current = personality.attracted_to;
    if (current.includes(attr)) {
      onChange({ attracted_to: current.filter(a => a !== attr) });
    } else if (current.length < 5) {
      onChange({ attracted_to: [...current, attr] });
    }
  };

  const toggleTurnOn = (turnOn: string) => {
    const current = personality.turn_ons;
    if (current.includes(turnOn)) {
      onChange({ turn_ons: current.filter(t => t !== turnOn) });
    } else if (current.length < 5) {
      onChange({ turn_ons: [...current, turnOn] });
    }
  };

  return (
    <div className="space-y-8">
      {/* Info banner */}
      <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-4">
        <p className="text-sm text-pink-300">
          💕 This section defines how she connects romantically. Keep it suggestive but tasteful -
          these vibes will guide her flirting style in chat.
        </p>
      </div>

      {/* Flirting Style */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Flirting Style
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Pick 1-2 styles. Selected: {personality.flirting_style.length}/2
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FLIRTING_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => toggleFlirtStyle(style.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                personality.flirting_style.includes(style.id)
                  ? 'bg-pink-500/20 border-pink-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{style.icon}</span>
                <span className="font-medium">{style.label}</span>
              </div>
              <div className="text-xs text-gray-500">{style.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Her Dynamic
        </label>
        <div className="grid grid-cols-3 gap-3">
          {DYNAMICS.map((dyn) => (
            <button
              key={dyn.id}
              onClick={() => onChange({ dynamic: dyn.id as AIPersonalityFull['dynamic'] })}
              className={`p-4 rounded-xl border text-center transition-all ${
                personality.dynamic === dyn.id
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="text-2xl mb-2">{dyn.icon}</div>
              <div className="font-medium">{dyn.label}</div>
              <div className="text-xs text-gray-500 mt-1">{dyn.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* What Attracts Her */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          What Attracts Her
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Pick up to 5. Selected: {personality.attracted_to.length}/5
        </p>
        <div className="flex flex-wrap gap-2">
          {ATTRACTED_TO.map((attr) => (
            <button
              key={attr}
              onClick={() => toggleAttractedTo(attr)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                personality.attracted_to.includes(attr)
                  ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              {attr}
            </button>
          ))}
        </div>
      </div>

      {/* Love Language */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Love Language
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LOVE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => onChange({ love_language: lang.id as AIPersonalityFull['love_language'] })}
              className={`p-4 rounded-xl border text-left transition-all ${
                personality.love_language === lang.id
                  ? 'bg-pink-500/20 border-pink-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{lang.icon}</span>
                <span className="font-medium">{lang.label}</span>
              </div>
              <div className="text-xs text-gray-500">{lang.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pace */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Romantic Pace
        </label>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm w-20">Slow Tease</span>
          <input
            type="range"
            min={1}
            max={10}
            value={personality.pace}
            onChange={(e) => onChange({ pace: parseInt(e.target.value) })}
            className="flex-1 accent-pink-500"
          />
          <span className="text-gray-500 text-sm w-20 text-right">Fast & Hot</span>
        </div>
        <div className="text-center mt-2">
          <span className="text-pink-400 font-medium">
            {personality.pace <= 3 ? '⏳ Slow burn - builds anticipation' :
             personality.pace <= 6 ? '💫 Balanced - goes with the flow' :
             '🔥 Fast & intense - doesn\'t hold back'}
          </span>
        </div>
      </div>

      {/* The Vibe She Creates */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          The Vibe She Creates
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VIBES_CREATES.map((vibe) => (
            <button
              key={vibe.id}
              onClick={() => onChange({ vibe_creates: vibe.id as AIPersonalityFull['vibe_creates'] })}
              className={`p-4 rounded-xl border text-center transition-all ${
                personality.vibe_creates === vibe.id
                  ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-pink-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="text-2xl mb-2">{vibe.icon}</div>
              <div className="font-medium">{vibe.label}</div>
              <div className="text-xs text-gray-500 mt-1">{vibe.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Turn Ons (Compliant) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Likes
        </label>
        <p className="text-xs text-gray-400 mb-3">
          Fantasy Modes — Choose the styles of roleplay your AI is allowed to explore
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Pick up to 5. Selected: {personality.turn_ons.length}/5
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TURN_ONS.map((turnOn) => (
            <button
              key={turnOn.id}
              onClick={() => toggleTurnOn(turnOn.id)}
              className={`p-3 rounded-xl border text-left transition-all text-sm ${
                personality.turn_ons.includes(turnOn.id)
                  ? 'bg-gradient-to-r from-pink-500/20 to-red-500/20 border-pink-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <span className="mr-2">{turnOn.icon}</span>
              {turnOn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { AIPersonalityFull } from '@/lib/ai/personality/types';
import {
  SPEECH_PATTERNS,
  ACCENT_FLAVORS,
} from '@/lib/ai/personality/options';

interface Step5Props {
  personality: AIPersonalityFull;
  onChange: (updates: Partial<AIPersonalityFull>) => void;
}

export function Step5Voice({ personality, onChange }: Step5Props) {
  const togglePattern = (patternId: string) => {
    const current = personality.speech_patterns;
    if (current.includes(patternId)) {
      onChange({ speech_patterns: current.filter(p => p !== patternId) });
    } else if (current.length < 4) {
      onChange({ speech_patterns: [...current, patternId] });
    }
  };

  const getExampleMessage = (): string => {
    let msg = '';

    // Base message based on vocabulary level
    if (personality.vocabulary_level <= 3) {
      msg = 'hey whats up';
    } else if (personality.vocabulary_level <= 6) {
      msg = 'Hey there! How are you doing today?';
    } else {
      msg = 'Hello, I hope this evening finds you well';
    }

    // Apply accent flavor first
    if (personality.accent_flavor === 'southern_sweetness') {
      msg = msg.replace('Hey there!', "Well hey there, sugar!");
      msg = msg.replace('hey whats up', "hey darlin, how ya doin");
    } else if (personality.accent_flavor === 'valley_girl') {
      msg = msg.replace('Hey there!', 'Like, hey!');
      msg = msg.replace('hey whats up', 'omg hey whats up');
    } else if (personality.accent_flavor === 'cali_chill') {
      msg = msg.replace('Hey there!', 'Hey, whats good!');
    }

    // Apply speech patterns
    if (personality.speech_patterns.includes('trailing')) {
      msg = msg.replace('?', '...').replace('!', '...');
    }

    if (personality.speech_patterns.includes('pet_names') && !msg.includes('babe') && !msg.includes('darling') && !msg.includes('sugar')) {
      if (personality.vocabulary_level <= 3) {
        msg = 'hey babe, ' + msg.replace('hey ', '');
      } else if (personality.vocabulary_level <= 6) {
        msg = msg.replace('Hey there', 'Hey baby');
      } else {
        msg = msg.replace('Hello,', 'Hello darling,');
      }
    }

    if (personality.speech_patterns.includes('playful_teasing')) {
      msg += ' I was just thinking about you';
    }

    if (personality.speech_patterns.includes('expressive_reactions')) {
      msg = msg.replace('Hello', 'Ooh, hello').replace('Hey', 'Ooh hey');
    }

    // Add emojis based on setting
    if (personality.emoji_usage === 'heavy') {
      msg += ' 💕😘✨🔥';
    } else if (personality.emoji_usage === 'moderate') {
      msg += ' 💕';
    } else if (personality.emoji_usage === 'minimal') {
      msg += ' 😊';
    }

    return msg;
  };

  return (
    <div className="space-y-8">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Vocabulary Level
        </label>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm w-16">Simple</span>
          <input
            type="range"
            min={1}
            max={10}
            value={personality.vocabulary_level}
            onChange={(e) => onChange({ vocabulary_level: parseInt(e.target.value) })}
            className="flex-1 accent-purple-500"
          />
          <span className="text-gray-500 text-sm w-24 text-right">Sophisticated</span>
        </div>
        <div className="text-center mt-2">
          <span className="text-purple-400 font-medium">
            {personality.vocabulary_level <= 3 ? '💬 Casual & simple' :
             personality.vocabulary_level <= 6 ? '✨ Normal vocabulary' :
             '📚 Eloquent & refined'}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Emoji Usage
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'none', label: 'None', example: 'Hey there' },
            { id: 'minimal', label: 'Minimal', example: 'Hey there 😊' },
            { id: 'moderate', label: 'Moderate', example: 'Hey there 💕😘' },
            { id: 'heavy', label: 'Heavy', example: 'Hey there 💕🔥😍✨💋' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => onChange({ emoji_usage: option.id as AIPersonalityFull['emoji_usage'] })}
              className={`p-4 rounded-xl border text-center transition-all ${
                personality.emoji_usage === option.id
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="font-medium mb-1">{option.label}</div>
              <div className="text-xs text-gray-500">{option.example}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Response Length
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'short', label: 'Short & Punchy', example: '1-2 sentences' },
            { id: 'medium', label: 'Medium', example: '2-4 sentences' },
            { id: 'long', label: 'Long & Expressive', example: 'Detailed responses' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => onChange({ response_length: option.id as AIPersonalityFull['response_length'] })}
              className={`p-4 rounded-xl border text-center transition-all ${
                personality.response_length === option.id
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="font-medium mb-1">{option.label}</div>
              <div className="text-xs text-gray-500">{option.example}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Short = quick back & forth, Long = storytelling vibe
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Speech Patterns
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Pick up to 4. Selected: {personality.speech_patterns.length}/4
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SPEECH_PATTERNS.map((pattern) => (
            <button
              key={pattern.id}
              onClick={() => togglePattern(pattern.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                personality.speech_patterns.includes(pattern.id)
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="font-medium mb-1">{pattern.label}</div>
              <div className="text-xs text-gray-500">{pattern.example}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Accent / Flavor
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_FLAVORS.map((accent) => (
            <button
              key={accent.id}
              onClick={() => onChange({ accent_flavor: accent.id })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                personality.accent_flavor === accent.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {accent.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Signature Phrases (optional)
        </label>
        <input
          type="text"
          value={personality.signature_phrases || ''}
          onChange={(e) => onChange({ signature_phrases: e.target.value })}
          placeholder="e.g., hey baby, mmm, you're so bad, tell me more..."
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 text-base"
        />
        <p className="text-xs text-gray-500 mt-2">
          Phrases she uses often that make her unique
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="text-sm text-gray-400 mb-3">Live Preview - how she might say hi:</div>
        <div className="bg-black/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm">
              {personality.persona_name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="text-sm font-medium text-white mb-1">
                {personality.persona_name || 'Your AI'}
              </div>
              <div className="text-gray-300">
                {getExampleMessage()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

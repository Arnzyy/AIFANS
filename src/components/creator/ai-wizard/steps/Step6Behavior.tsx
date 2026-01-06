'use client';

import { AIPersonalityFull } from '@/lib/ai/personality/types';
import {
  TOPICS_LOVES,
  TOPICS_AVOIDS,
  WHEN_COMPLIMENTED,
  WHEN_HEATED,
} from '@/lib/ai/personality/options';

interface Step6Props {
  personality: AIPersonalityFull;
  onChange: (updates: Partial<AIPersonalityFull>) => void;
}

export function Step6Behavior({ personality, onChange }: Step6Props) {
  const toggleTopicLoves = (topic: string) => {
    const current = personality.topics_loves;
    if (current.includes(topic)) {
      onChange({ topics_loves: current.filter(t => t !== topic) });
    } else if (current.length < 8) {
      onChange({ topics_loves: [...current, topic] });
    }
  };

  const toggleTopicAvoids = (topic: string) => {
    const current = personality.topics_avoids;
    if (current.includes(topic)) {
      onChange({ topics_avoids: current.filter(t => t !== topic) });
    } else if (current.length < 5) {
      onChange({ topics_avoids: [...current, topic] });
    }
  };

  return (
    <div className="space-y-8">
      {/* Topics She Loves */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Topics She LOVES Talking About 💕
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Pick up to 8. Selected: {personality.topics_loves.length}/8
        </p>
        <div className="flex flex-wrap gap-2">
          {TOPICS_LOVES.map((topic) => (
            <button
              key={topic}
              onClick={() => toggleTopicLoves(topic)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                personality.topics_loves.includes(topic)
                  ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              ❤️ {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Topics She Avoids */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Topics She Avoids 🚫
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Pick up to 5. Selected: {personality.topics_avoids.length}/5
        </p>
        <div className="flex flex-wrap gap-2">
          {TOPICS_AVOIDS.map((topic) => (
            <button
              key={topic}
              onClick={() => toggleTopicAvoids(topic)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                personality.topics_avoids.includes(topic)
                  ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              🚫 {topic}
            </button>
          ))}
        </div>
      </div>

      {/* When Complimented */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          When Someone Compliments Her
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WHEN_COMPLIMENTED.map((response) => (
            <button
              key={response.id}
              onClick={() => onChange({ when_complimented: response.id as AIPersonalityFull['when_complimented'] })}
              className={`p-4 rounded-xl border text-left transition-all ${
                personality.when_complimented === response.id
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{response.icon}</span>
                <span className="font-medium">{response.label}</span>
              </div>
              <div className="text-xs text-gray-500 italic">{response.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* When Things Get Heated */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          When Things Get Heated 🔥
        </label>
        <p className="text-xs text-gray-500 mb-3">
          How does she respond when the conversation gets spicy?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WHEN_HEATED.map((response) => (
            <button
              key={response.id}
              onClick={() => onChange({ when_heated: response.id as AIPersonalityFull['when_heated'] })}
              className={`p-4 rounded-xl border text-left transition-all ${
                personality.when_heated === response.id
                  ? 'bg-gradient-to-r from-pink-500/20 to-red-500/20 border-pink-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{response.icon}</span>
                <span className="font-medium">{response.label}</span>
              </div>
              <div className="text-xs text-gray-500">{response.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pet Peeves */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Pet Peeves (optional)
        </label>
        <input
          type="text"
          value={personality.pet_peeves || ''}
          onChange={(e) => onChange({ pet_peeves: e.target.value })}
          placeholder="e.g., One word replies, being ignored, rudeness..."
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 text-base"
        />
        <p className="text-xs text-gray-500 mt-2">
          Things that annoy her or make her lose interest
        </p>
      </div>

      {/* Behavior Summary */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="text-sm text-gray-400 mb-3">Behavior Summary:</div>
        <div className="space-y-2 text-sm">
          <p className="text-white">
            <span className="text-green-400">Loves:</span>{' '}
            {personality.topics_loves.slice(0, 4).join(', ') || 'Not set'}
          </p>
          <p className="text-white">
            <span className="text-red-400">Avoids:</span>{' '}
            {personality.topics_avoids.slice(0, 3).join(', ') || 'Not set'}
          </p>
          <p className="text-white">
            <span className="text-purple-400">Compliments:</span>{' '}
            {WHEN_COMPLIMENTED.find(w => w.id === personality.when_complimented)?.label || 'Not set'}
          </p>
          <p className="text-white">
            <span className="text-pink-400">When heated:</span>{' '}
            {WHEN_HEATED.find(w => w.id === personality.when_heated)?.label || 'Not set'}
          </p>
        </div>
      </div>
    </div>
  );
}

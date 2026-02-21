'use client';

// ===========================================
// VOICE SETTINGS PAGE
// Creator dashboard page for voice configuration
// ===========================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { VoiceSettingsPanel } from '@/components/voice';
import Link from 'next/link';

interface Personality {
  id: string;
  persona_name: string;
  is_active: boolean;
  avatar_url?: string;
}

export default function VoiceSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [personalities, setPersonalities] = useState<Personality[]>([]);
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPersonalities();
  }, []);

  const loadPersonalities = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch all personalities for this creator
      const response = await fetch('/api/creator/ai-personality');
      if (!response.ok) {
        throw new Error('Failed to load personalities');
      }

      const data = await response.json();
      const personalityList = data.personalities || [];
      setPersonalities(personalityList);

      // Auto-select the first personality if available
      if (personalityList.length > 0 && !selectedPersonalityId) {
        setSelectedPersonalityId(personalityList[0].id);
      }
    } catch (err) {
      console.error('Failed to load personalities:', err);
      setError('Failed to load AI personalities');
    } finally {
      setLoading(false);
    }
  };

  const selectedPersonality = personalities.find(p => p.id === selectedPersonalityId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // No personalities created yet
  if (personalities.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-6">🎙️</div>
        <h1 className="text-3xl font-bold mb-4">Voice Settings</h1>
        <p className="text-gray-400 mb-8 text-lg">
          You need to create an AI personality before configuring voice settings.
        </p>

        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 mb-8">
          <h3 className="font-semibold mb-4">What Voice enables:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-white/5 rounded-xl">
              <span className="text-xl mb-1 block">📞</span>
              Real-time voice calls
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <span className="text-xl mb-1 block">🎤</span>
              Voice messages
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <span className="text-xl mb-1 block">💬</span>
              Natural conversations
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/ai-personality"
          className="inline-block px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
        >
          Create AI Personality First
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Voice Settings</h1>
        <p className="text-gray-400 mt-1">
          Configure voice capabilities for your AI personas
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Personality Selector */}
      {personalities.length > 1 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <label className="block text-sm text-gray-400 mb-3">
            Select Personality
          </label>
          <div className="flex flex-wrap gap-3">
            {personalities.map((personality) => (
              <button
                key={personality.id}
                onClick={() => setSelectedPersonalityId(personality.id)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                  ${selectedPersonalityId === personality.id
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                  }
                `}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                  {personality.persona_name?.charAt(0) || '?'}
                </div>
                <div className="text-left">
                  <p className="font-medium">{personality.persona_name}</p>
                  <p className={`text-xs ${personality.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                    {personality.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice Settings Panel */}
      {selectedPersonality && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <VoiceSettingsPanel
            personalityId={selectedPersonality.id}
            personalityName={selectedPersonality.persona_name}
          />
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📞</span>
            <div>
              <h3 className="font-medium">Real-Time Voice Calls</h3>
              <p className="text-sm text-gray-400 mt-1">
                Premium subscribers can have live voice conversations with your AI persona.
                Enable "Real-Time Voice Calls" toggle above.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎚️</span>
            <div>
              <h3 className="font-medium">Voice Parameters</h3>
              <p className="text-sm text-gray-400 mt-1">
                Adjust stability for consistency, similarity for voice matching,
                and style for expressiveness.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Feature Notice */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <h3 className="font-medium text-yellow-400">Premium Feature</h3>
            <p className="text-sm text-gray-400 mt-1">
              Real-time voice calls are available to premium subscribers only.
              Each subscriber gets 60 voice minutes per month included with their subscription.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

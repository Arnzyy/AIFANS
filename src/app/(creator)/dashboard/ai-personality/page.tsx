'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { AIPersonalityWizard } from '@/components/creator/ai-wizard';
import { AIPersonalityFull } from '@/lib/ai/personality/types';
import Link from 'next/link';

export default function AIPersonalityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [existingPersonality, setExistingPersonality] = useState<AIPersonalityFull | undefined>();
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    loadPersonality();
  }, []);

  const loadPersonality = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setCreatorId(user.id);

      // Check if user has an existing personality
      const response = await fetch('/api/creator/ai-personality');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setExistingPersonality(data);
        }
      }
    } catch (error) {
      console.error('Failed to load personality:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (personality: AIPersonalityFull) => {
    setExistingPersonality(personality);
    setShowWizard(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showWizard && creatorId) {
    return (
      <AIPersonalityWizard
        creatorId={creatorId}
        existingPersonality={existingPersonality}
        onComplete={handleComplete}
      />
    );
  }

  // Show overview if personality exists
  if (existingPersonality) {
    return (
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Personality</h1>
            <p className="text-gray-400 mt-1">
              Your custom AI persona for chatting with subscribers
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Edit Personality
          </button>
        </div>

        {/* Status Card */}
        <div className={`p-4 rounded-xl border ${existingPersonality.is_active ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{existingPersonality.is_active ? '✨' : '⏸️'}</span>
            <div>
              <p className={`font-medium ${existingPersonality.is_active ? 'text-green-400' : 'text-yellow-400'}`}>
                {existingPersonality.is_active ? 'AI Persona Active' : 'AI Persona Paused'}
              </p>
              <p className="text-sm text-gray-400">
                {existingPersonality.is_active
                  ? `${existingPersonality.persona_name} is ready to chat with subscribers`
                  : 'Your AI persona is not active'}
              </p>
            </div>
          </div>
        </div>

        {/* Personality Overview */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold">
              {existingPersonality.persona_name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{existingPersonality.persona_name}</h2>
              <p className="text-gray-400">{existingPersonality.age} years old • {existingPersonality.occupation || 'No occupation set'}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {existingPersonality.personality_traits.slice(0, 4).map((trait) => (
                  <span key={trait} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Body Type</p>
              <p className="font-medium capitalize">{existingPersonality.body_type}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Dynamic</p>
              <p className="font-medium capitalize">{existingPersonality.dynamic}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Emojis</p>
              <p className="font-medium capitalize">{existingPersonality.emoji_usage}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Response Length</p>
              <p className="font-medium capitalize">{existingPersonality.response_length}</p>
            </div>
          </div>

          {existingPersonality.backstory && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">Backstory</p>
              <p className="text-sm text-gray-300">{existingPersonality.backstory}</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-sm text-gray-400">Flirting Style</p>
            <p className="font-medium mt-1">
              {existingPersonality.flirting_style.join(', ') || 'Not set'}
            </p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-sm text-gray-400">Topics She Loves</p>
            <p className="font-medium mt-1">
              {existingPersonality.topics_loves.slice(0, 3).join(', ') || 'Not set'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/dashboard/ai-chat"
            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-center font-medium hover:bg-white/10 transition-colors"
          >
            Configure Chat Settings
          </Link>
          <button
            onClick={() => setShowWizard(true)}
            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Open Personality Wizard
          </button>
        </div>
      </div>
    );
  }

  // Show create prompt if no personality exists
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="text-6xl mb-6">🎭</div>
      <h1 className="text-3xl font-bold mb-4">Create Your AI Persona</h1>
      <p className="text-gray-400 mb-8 text-lg">
        Build a unique AI personality that chats with your subscribers 24/7.
        Configure everything from her appearance to her flirting style.
      </p>

      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 mb-8">
        <h3 className="font-semibold mb-4">What you'll configure:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-white/5 rounded-xl">
            <span className="text-xl mb-1 block">👤</span>
            Identity & Look
          </div>
          <div className="p-3 bg-white/5 rounded-xl">
            <span className="text-xl mb-1 block">✨</span>
            Personality
          </div>
          <div className="p-3 bg-white/5 rounded-xl">
            <span className="text-xl mb-1 block">📖</span>
            Background
          </div>
          <div className="p-3 bg-white/5 rounded-xl">
            <span className="text-xl mb-1 block">💕</span>
            Romantic Style
          </div>
          <div className="p-3 bg-white/5 rounded-xl">
            <span className="text-xl mb-1 block">🗣️</span>
            Voice & Speech
          </div>
          <div className="p-3 bg-white/5 rounded-xl">
            <span className="text-xl mb-1 block">🎭</span>
            Behavior
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowWizard(true)}
        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
      >
        Start Building →
      </button>
    </div>
  );
}

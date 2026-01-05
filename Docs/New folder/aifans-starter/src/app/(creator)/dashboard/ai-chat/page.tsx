'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

const personalityTraits = [
  { id: 'flirty', label: 'Flirty', icon: '😘' },
  { id: 'dominant', label: 'Dominant', icon: '👑' },
  { id: 'submissive', label: 'Submissive', icon: '🙈' },
  { id: 'playful', label: 'Playful', icon: '😜' },
  { id: 'teasing', label: 'Teasing', icon: '😏' },
  { id: 'sweet', label: 'Sweet', icon: '🥰' },
  { id: 'mysterious', label: 'Mysterious', icon: '🌙' },
  { id: 'confident', label: 'Confident', icon: '💪' },
  { id: 'shy', label: 'Shy', icon: '😊' },
  { id: 'intellectual', label: 'Intellectual', icon: '🧠' },
];

const kinkCategories = [
  'Vanilla/Romantic',
  'Light BDSM',
  'Roleplay',
  'Praise/Worship',
  'Tease & Denial',
  'Dirty Talk',
  'Power Exchange',
  'Fantasy Scenarios',
];

export default function AIChatSetupPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // AI Persona settings
  const [enabled, setEnabled] = useState(false);
  const [personaName, setPersonaName] = useState('');
  const [personaAge, setPersonaAge] = useState('');
  const [backstory, setBackstory] = useState('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [interests, setInterests] = useState('');
  const [turnOns, setTurnOns] = useState('');
  const [turnOffs, setTurnOffs] = useState('');
  const [boundaries, setBoundaries] = useState('');
  const [selectedKinks, setSelectedKinks] = useState<string[]>([]);
  const [responseStyle, setResponseStyle] = useState<'short' | 'medium' | 'long'>('medium');
  const [emojiUsage, setEmojiUsage] = useState<'none' | 'some' | 'lots'>('some');
  
  // Pricing
  const [pricingModel, setPricingModel] = useState<'per_message' | 'per_minute' | 'included'>('per_message');
  const [messagePrice, setMessagePrice] = useState('0.50');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: personality } = await supabase
        .from('ai_personalities')
        .select('*')
        .eq('creator_id', user.id)
        .single();

      if (personality) {
        setEnabled(personality.is_active);
        setPersonaName(personality.persona_name || '');
        setPersonaAge(personality.persona_age?.toString() || '');
        setBackstory(personality.backstory || '');
        setSelectedTraits(personality.personality_traits || []);
        setInterests(personality.interests?.join(', ') || '');
        setTurnOns(personality.turn_ons?.join(', ') || '');
        setTurnOffs(personality.turn_offs?.join(', ') || '');
        setBoundaries(personality.hard_boundaries?.join('\n') || '');
        setSelectedKinks(personality.allowed_kinks || []);
        setResponseStyle(personality.response_length || 'medium');
        setEmojiUsage(personality.emoji_usage || 'some');
        setPricingModel(personality.pricing_model || 'per_message');
        setMessagePrice((personality.price_per_message / 100).toFixed(2) || '0.50');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrait = (traitId: string) => {
    setSelectedTraits(prev => 
      prev.includes(traitId) 
        ? prev.filter(t => t !== traitId)
        : [...prev, traitId]
    );
  };

  const toggleKink = (kink: string) => {
    setSelectedKinks(prev => 
      prev.includes(kink) 
        ? prev.filter(k => k !== kink)
        : [...prev, kink]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const personalityData = {
        creator_id: user.id,
        is_active: enabled,
        persona_name: personaName || null,
        persona_age: personaAge ? parseInt(personaAge) : null,
        backstory: backstory || null,
        personality_traits: selectedTraits,
        interests: interests.split(',').map(s => s.trim()).filter(Boolean),
        turn_ons: turnOns.split(',').map(s => s.trim()).filter(Boolean),
        turn_offs: turnOffs.split(',').map(s => s.trim()).filter(Boolean),
        hard_boundaries: boundaries.split('\n').map(s => s.trim()).filter(Boolean),
        allowed_kinks: selectedKinks,
        response_length: responseStyle,
        emoji_usage: emojiUsage,
        pricing_model: pricingModel,
        price_per_message: Math.round(parseFloat(messagePrice) * 100),
      };

      const { error: upsertError } = await supabase
        .from('ai_personalities')
        .upsert(personalityData, { onConflict: 'creator_id' });

      if (upsertError) throw upsertError;

      // Update creator profile
      await supabase
        .from('creator_profiles')
        .update({ ai_chat_enabled: enabled })
        .eq('user_id', user.id);

      setSuccess('Settings saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">AI Chat Setup</h1>
        <p className="text-gray-400 mt-1">
          Configure your AI persona to chat with fans 24/7
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          {success}
        </div>
      )}

      {/* Enable toggle */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="font-medium">Enable AI Chat</p>
              <p className="text-sm text-gray-500">Let AI respond to fans when you're away</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-purple-500' : 'bg-white/10'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </div>
          </div>
        </label>
      </div>

      {/* Platform notice */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-sm text-blue-200">
          ℹ️ <strong>Platform Rules:</strong> Your AI will follow platform guidelines automatically. 
          It will engage in flirty/erotic conversation but won't produce explicit pornographic content. 
          It will never claim to be a real person or agree to meet in real life.
        </p>
      </div>

      {enabled && (
        <>
          {/* Persona Identity */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Persona Identity</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Persona Name</label>
                <input
                  type="text"
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  placeholder="Luna, Aria, etc."
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Persona Age (18+)</label>
                <input
                  type="number"
                  min="18"
                  max="99"
                  value={personaAge}
                  onChange={(e) => setPersonaAge(e.target.value)}
                  placeholder="21"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Backstory / Lore</label>
              <textarea
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                rows={3}
                placeholder="A mysterious artist who loves late night conversations..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors resize-none"
              />
            </div>
          </section>

          {/* Personality Traits */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Personality Traits</h2>
            <div className="flex flex-wrap gap-2">
              {personalityTraits.map((trait) => (
                <button
                  key={trait.id}
                  type="button"
                  onClick={() => toggleTrait(trait.id)}
                  className={`px-4 py-2 rounded-full transition-colors ${
                    selectedTraits.includes(trait.id)
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {trait.icon} {trait.label}
                </button>
              ))}
            </div>
          </section>

          {/* Interests & Preferences */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Interests & Preferences</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Interests / Hobbies</label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="Art, music, travel, gaming..."
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">Comma separated</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Turn Ons 🔥</label>
                <input
                  type="text"
                  value={turnOns}
                  onChange={(e) => setTurnOns(e.target.value)}
                  placeholder="Confidence, humor..."
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Turn Offs 🚫</label>
                <input
                  type="text"
                  value={turnOffs}
                  onChange={(e) => setTurnOffs(e.target.value)}
                  placeholder="Rudeness, impatience..."
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Allowed Themes */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Allowed Themes</h2>
            <p className="text-sm text-gray-400">Select what your AI can engage with</p>
            <div className="flex flex-wrap gap-2">
              {kinkCategories.map((kink) => (
                <button
                  key={kink}
                  type="button"
                  onClick={() => toggleKink(kink)}
                  className={`px-4 py-2 rounded-full transition-colors ${
                    selectedKinks.includes(kink)
                      ? 'bg-pink-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {kink}
                </button>
              ))}
            </div>
          </section>

          {/* Boundaries */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Hard Boundaries</h2>
            <p className="text-sm text-gray-400">Topics your AI will refuse to engage with (one per line)</p>
            <textarea
              value={boundaries}
              onChange={(e) => setBoundaries(e.target.value)}
              rows={4}
              placeholder="Example topics to block..."
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors resize-none"
            />
          </section>

          {/* Response Style */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Response Style</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Response Length</label>
                <select
                  value={responseStyle}
                  onChange={(e) => setResponseStyle(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
                >
                  <option value="short">Short & punchy</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long & detailed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Emoji Usage</label>
                <select
                  value={emojiUsage}
                  onChange={(e) => setEmojiUsage(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
                >
                  <option value="none">None</option>
                  <option value="some">Some</option>
                  <option value="lots">Lots 😘✨</option>
                </select>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">AI Chat Pricing</h2>
            
            <div className="space-y-3">
              <label className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${pricingModel === 'included' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'}`}>
                <input
                  type="radio"
                  name="pricing"
                  checked={pricingModel === 'included'}
                  onChange={() => setPricingModel('included')}
                  className="text-purple-500"
                />
                <div>
                  <p className="font-medium">Included in subscription</p>
                  <p className="text-sm text-gray-500">Subscribers chat for free</p>
                </div>
              </label>

              <label className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${pricingModel === 'per_message' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'}`}>
                <input
                  type="radio"
                  name="pricing"
                  checked={pricingModel === 'per_message'}
                  onChange={() => setPricingModel('per_message')}
                  className="text-purple-500"
                />
                <div className="flex-1">
                  <p className="font-medium">Per message</p>
                  <p className="text-sm text-gray-500">Charge per AI response</p>
                </div>
                {pricingModel === 'per_message' && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">£</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={messagePrice}
                      onChange={(e) => setMessagePrice(e.target.value)}
                      className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-right"
                    />
                  </div>
                )}
              </label>
            </div>
          </section>
        </>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

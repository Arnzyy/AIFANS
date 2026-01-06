'use client';

import { useState } from 'react';
import {
  Heart,
  Info,
  Save,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageCircle,
  Zap,
  Palette,
  Shield,
} from 'lucide-react';

// Import SFW-specific types
import {
  SFWPersonalityConfig,
  SFWPersonalityTrait,
  SFWFlirtLevel,
  SFW_PERSONALITY_TRAITS,
  SFW_FLIRT_LEVELS,
  DEFAULT_SFW_CONFIG,
  SFWPhysicalTraits,
} from '@/lib/sfw-chat/types';

// ===========================================
// OPTIONS (SFW-SAFE ONLY)
// ===========================================

const BODY_TYPES = [
  { value: 'slim', label: 'Slim' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'petite', label: 'Petite' },
  { value: 'average', label: 'Average' },
];

const OUTFIT_OPTIONS = [
  'Sundresses', 'Jeans & T-shirt', 'Business casual', 'Athleisure',
  'Sweaters', 'Blazers', 'Maxi dresses', 'Casual chic',
];

const AESTHETIC_OPTIONS = [
  'Casual', 'Elegant', 'Sporty', 'Boho', 'Classic', 'Minimalist',
];

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function SFWChatSetupPage() {
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    flirtLevel: true,
    personality: true,
    interests: false,
    physical: false,
    style: false,
    pricing: true,
  });

  const [config, setConfig] = useState<SFWPersonalityConfig>({
    ...DEFAULT_SFW_CONFIG,
    creator_id: '', // Will be set from auth
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleTrait = (trait: SFWPersonalityTrait) => {
    setConfig((prev) => ({
      ...prev,
      personality_traits: prev.personality_traits.includes(trait)
        ? prev.personality_traits.filter((t) => t !== trait)
        : [...prev.personality_traits, trait],
    }));
  };

  const updatePhysicalTrait = (key: keyof SFWPhysicalTraits, value: any) => {
    setConfig((prev) => ({
      ...prev,
      physical_traits: { ...prev.physical_traits, [key]: value },
    }));
  };

  const toggleArrayItem = (key: keyof SFWPhysicalTraits, item: string) => {
    const current = (config.physical_traits?.[key] as string[]) || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    updatePhysicalTrait(key, updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: API call to save SFW config
      await new Promise((r) => setTimeout(r, 1000));
      alert('SFW Companion Chat settings saved!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-400" />
            Companion Chat Setup
          </h1>
          <p className="text-gray-400 mt-1">
            Configure your SFW AI companion for friendly, flirty conversations
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Enable Toggle */}
      <div className="bg-zinc-900 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="font-medium">Enable Companion Chat</p>
              <p className="text-sm text-gray-400">Warm, engaging SFW conversations</p>
            </div>
          </div>
          <button
            onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
            className={`w-14 h-7 rounded-full transition-colors ${
              config.enabled ? 'bg-pink-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                config.enabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Platform Rules Info */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex gap-3">
        <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-green-300 mb-1">Companion Mode Rules</p>
          <p className="text-green-200/80">
            Your AI will be warm, playful, and engaging — but keep things tasteful.
            If users request explicit content, the AI will redirect gracefully without
            breaking character. No claims of being human or agreeing to meet IRL.
          </p>
        </div>
      </div>

      {/* Sections */}
      {config.enabled && (
        <div className="space-y-4">
          {/* Persona Identity */}
          <Section
            title="Persona Identity"
            icon={Sparkles}
            expanded={expandedSections.identity}
            onToggle={() => toggleSection('identity')}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Persona Name</label>
                <input
                  type="text"
                  value={config.persona_name}
                  onChange={(e) => setConfig((p) => ({ ...p, persona_name: e.target.value }))}
                  placeholder="Luna, Aria, etc."
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Persona Age (18+)</label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={config.persona_age}
                  onChange={(e) => setConfig((p) => ({ ...p, persona_age: parseInt(e.target.value) || 18 }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Backstory / Lore</label>
              <textarea
                value={config.backstory}
                onChange={(e) => setConfig((p) => ({ ...p, backstory: e.target.value }))}
                placeholder="A creative soul who loves good conversation and making people smile..."
                rows={3}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500 resize-none"
              />
            </div>
          </Section>

          {/* Flirt Level (SFW Specific) */}
          <Section
            title="Flirt Level"
            icon={Heart}
            expanded={expandedSections.flirtLevel}
            onToggle={() => toggleSection('flirtLevel')}
            badge="SFW"
          >
            <p className="text-sm text-gray-400 mb-4">
              Choose how flirtatious your companion will be (all options are SFW)
            </p>
            <div className="space-y-3">
              {SFW_FLIRT_LEVELS.map((level) => (
                <label
                  key={level.id}
                  className={`block p-4 rounded-lg border cursor-pointer transition ${
                    config.flirt_level === level.id
                      ? 'border-pink-500 bg-pink-500/10'
                      : 'border-white/10 bg-zinc-800 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="flirt_level"
                      checked={config.flirt_level === level.id}
                      onChange={() => setConfig((p) => ({ ...p, flirt_level: level.id }))}
                      className="w-4 h-4 text-pink-500"
                    />
                    <div>
                      <p className="font-medium">{level.label}</p>
                      <p className="text-sm text-gray-400">{level.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </Section>

          {/* Personality Traits */}
          <Section
            title="Personality Traits"
            icon={Sparkles}
            expanded={expandedSections.personality}
            onToggle={() => toggleSection('personality')}
          >
            <div className="flex flex-wrap gap-2">
              {SFW_PERSONALITY_TRAITS.map((trait) => (
                <button
                  key={trait.id}
                  onClick={() => toggleTrait(trait.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    config.personality_traits.includes(trait.id)
                      ? 'bg-pink-500 text-white'
                      : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                  }`}
                >
                  {trait.emoji} {trait.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Interests */}
          <Section
            title="Interests & Preferences"
            icon={MessageCircle}
            expanded={expandedSections.interests}
            onToggle={() => toggleSection('interests')}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Interests / Hobbies</label>
                <input
                  type="text"
                  value={config.interests.join(', ')}
                  onChange={(e) => setConfig((p) => ({
                    ...p,
                    interests: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  }))}
                  placeholder="Art, music, travel, gaming, movies..."
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">Comma separated</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Things That Make Me Happy 😊</label>
                  <input
                    type="text"
                    value={config.turn_ons}
                    onChange={(e) => setConfig((p) => ({ ...p, turn_ons: e.target.value }))}
                    placeholder="Good conversation, humor, kindness..."
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Things I Don't Enjoy 😕</label>
                  <input
                    type="text"
                    value={config.turn_offs}
                    onChange={(e) => setConfig((p) => ({ ...p, turn_offs: e.target.value }))}
                    placeholder="Rudeness, being ignored..."
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* Physical Traits (SFW Safe) */}
          <Section
            title="Appearance"
            icon={Palette}
            expanded={expandedSections.physical}
            onToggle={() => toggleSection('physical')}
          >
            <p className="text-sm text-gray-400 mb-4">
              Optional details your companion can mention naturally when asked
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Height</label>
                  <input
                    type="text"
                    value={config.physical_traits?.height_range || ''}
                    onChange={(e) => updatePhysicalTrait('height_range', e.target.value)}
                    placeholder="5'4 - 5'6"
                    className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Build</label>
                  <select
                    value={config.physical_traits?.body_type || ''}
                    onChange={(e) => updatePhysicalTrait('body_type', e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-pink-500"
                  >
                    <option value="">Select...</option>
                    {BODY_TYPES.map((bt) => (
                      <option key={bt.value} value={bt.value}>{bt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hair</label>
                  <input
                    type="text"
                    value={config.physical_traits?.hair_colour || ''}
                    onChange={(e) => updatePhysicalTrait('hair_colour', e.target.value)}
                    placeholder="Brown, Blonde..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Eyes</label>
                  <input
                    type="text"
                    value={config.physical_traits?.eye_colour || ''}
                    onChange={(e) => updatePhysicalTrait('eye_colour', e.target.value)}
                    placeholder="Green, Blue..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Fashion Aesthetic */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Style Aesthetic</label>
                <div className="flex flex-wrap gap-2">
                  {AESTHETIC_OPTIONS.map((aesthetic) => (
                    <button
                      key={aesthetic}
                      onClick={() => updatePhysicalTrait('fashion_aesthetic', aesthetic)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        config.physical_traits?.fashion_aesthetic === aesthetic
                          ? 'bg-pink-500 text-white'
                          : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      }`}
                    >
                      {aesthetic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Favourite Outfits */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Favourite Outfits</label>
                <div className="flex flex-wrap gap-2">
                  {OUTFIT_OPTIONS.map((outfit) => (
                    <button
                      key={outfit}
                      onClick={() => toggleArrayItem('favourite_outfits', outfit)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        (config.physical_traits?.favourite_outfits || []).includes(outfit)
                          ? 'bg-pink-500 text-white'
                          : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      }`}
                    >
                      {outfit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Response Style */}
          <Section
            title="Response Style"
            icon={Zap}
            expanded={expandedSections.style}
            onToggle={() => toggleSection('style')}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Response Length</label>
                <select
                  value={config.response_length}
                  onChange={(e) => setConfig((p) => ({ ...p, response_length: e.target.value as any }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Emoji Usage</label>
                <select
                  value={config.emoji_usage}
                  onChange={(e) => setConfig((p) => ({ ...p, emoji_usage: e.target.value as any }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-pink-500"
                >
                  <option value="none">None</option>
                  <option value="minimal">Minimal</option>
                  <option value="some">Some</option>
                  <option value="lots">Lots</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Pricing */}
          <Section
            title="Companion Chat Pricing"
            icon={PoundSterling}
            expanded={expandedSections.pricing}
            onToggle={() => toggleSection('pricing')}
          >
            <div className="space-y-3">
              <label
                className={`block p-4 rounded-lg border cursor-pointer transition ${
                  config.pricing_model === 'included'
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-white/10 bg-zinc-800 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="pricing"
                    checked={config.pricing_model === 'included'}
                    onChange={() => setConfig((p) => ({ ...p, pricing_model: 'included' }))}
                    className="w-4 h-4 text-pink-500"
                  />
                  <div>
                    <p className="font-medium">Included in subscription</p>
                    <p className="text-sm text-gray-400">Subscribers chat for free</p>
                  </div>
                </div>
              </label>

              <label
                className={`block p-4 rounded-lg border cursor-pointer transition ${
                  config.pricing_model === 'per_message'
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-white/10 bg-zinc-800 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="pricing"
                      checked={config.pricing_model === 'per_message'}
                      onChange={() => setConfig((p) => ({ ...p, pricing_model: 'per_message' }))}
                      className="w-4 h-4 text-pink-500"
                    />
                    <div>
                      <p className="font-medium">Per message</p>
                      <p className="text-sm text-gray-400">Charge per AI response</p>
                    </div>
                  </div>
                  {config.pricing_model === 'per_message' && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">£</span>
                      <input
                        type="number"
                        min={0.10}
                        step={0.05}
                        value={config.price_per_message}
                        onChange={(e) => setConfig((p) => ({ ...p, price_per_message: parseFloat(e.target.value) || 0 }))}
                        className="w-20 px-3 py-1.5 bg-zinc-700 border border-white/10 rounded-lg text-center focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// ===========================================
// SECTION COMPONENT
// ===========================================

function Section({
  title,
  icon: Icon,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-pink-400" />
          <span className="font-medium">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-pink-500 text-white rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Placeholder icon
function PoundSterling({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 7c0-1.7-1.3-3-3-3h-3c-1.7 0-3 1.3-3 3v5c0 1.7-1.3 3-3 3" />
      <path d="M6 17h12" />
      <path d="M6 12h12" />
    </svg>
  );
}

'use client';

import { useState } from 'react';
import {
  Bot,
  Info,
  Save,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageCircle,
  Zap,
  Heart,
  Shield,
  Palette,
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface AIPersonality {
  enabled: boolean;
  persona_name: string;
  persona_age: number;
  backstory: string;
  personality_traits: string[];
  interests: string[];
  turn_ons: string;
  turn_offs: string;
  allowed_themes: string[];
  hard_boundaries: string;
  response_length: 'short' | 'medium' | 'long';
  emoji_usage: 'none' | 'minimal' | 'some' | 'lots';
  pricing_model: 'included' | 'per_message';
  price_per_message: number;
  physical_traits: PhysicalTraits;
}

interface PhysicalTraits {
  height_range?: string;
  body_type?: string;
  dress_size?: string;
  shoe_size?: string;
  breast_size?: string;
  favourite_outfits?: string[];
  favourite_lingerie_styles?: string[];
  favourite_lingerie_colours?: string[];
  fashion_aesthetic?: string;
  styling_descriptors?: string[];
  hair_colour?: string;
  eye_colour?: string;
}

// ===========================================
// OPTIONS
// ===========================================

const PERSONALITY_TRAITS = [
  { id: 'flirty', label: 'Flirty', emoji: '😘' },
  { id: 'dominant', label: 'Dominant', emoji: '👑' },
  { id: 'submissive', label: 'Submissive', emoji: '🦋' },
  { id: 'playful', label: 'Playful', emoji: '😜' },
  { id: 'teasing', label: 'Teasing', emoji: '😏' },
  { id: 'sweet', label: 'Sweet', emoji: '🥰' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🌙' },
  { id: 'confident', label: 'Confident', emoji: '💪' },
  { id: 'shy', label: 'Shy', emoji: '🙈' },
  { id: 'intellectual', label: 'Intellectual', emoji: '🧠' },
  { id: 'romantic', label: 'Romantic', emoji: '💕' },
  { id: 'sassy', label: 'Sassy', emoji: '💅' },
];

const ALLOWED_THEMES = [
  'Vanilla/Romantic',
  'Light BDSM',
  'Roleplay',
  'Praise/Worship',
  'Tease & Denial',
  'Dirty Talk',
  'Power Exchange',
  'Fantasy Scenarios',
];

const BODY_TYPES = [
  { value: 'slim', label: 'Slim' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'petite', label: 'Petite' },
  { value: 'hourglass', label: 'Hourglass' },
  { value: 'natural', label: 'Natural' },
];

const OUTFIT_OPTIONS = [
  'Bodysuits', 'Fitted dresses', 'Matching sets', 'Oversized shirts',
  'High-waisted jeans', 'Mini skirts', 'Crop tops', 'Blazers',
  'Sundresses', 'Athleisure', 'Silk blouses', 'Leather jackets',
];

const LINGERIE_STYLES = [
  'Lace', 'Silk', 'Minimal', 'Strappy', 'Classic', 'Sheer',
  'Sporty', 'Vintage', 'Bold', 'Delicate', 'Matching sets',
];

const LINGERIE_COLOURS = [
  'Black', 'White', 'Red', 'Wine', 'Blush pink', 'Navy',
  'Deep green', 'Nude', 'Champagne', 'Burgundy',
];

const AESTHETIC_OPTIONS = [
  'Minimal chic', 'Bold glamour', 'Soft feminine', 'Edgy',
  'Classic elegance', 'Boho', 'Sporty luxe', 'Dark romantic',
];

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function AIchatSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    personality: true,
    preferences: false,
    themes: false,
    physical: false,
    style: false,
    pricing: true,
  });

  const [settings, setSettings] = useState<AIPersonality>({
    enabled: false,
    persona_name: '',
    persona_age: 21,
    backstory: '',
    personality_traits: [],
    interests: '',
    turn_ons: '',
    turn_offs: '',
    allowed_themes: [],
    hard_boundaries: '',
    response_length: 'medium',
    emoji_usage: 'some',
    pricing_model: 'included',
    price_per_message: 0.50,
    physical_traits: {},
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleTrait = (trait: string) => {
    setSettings((prev) => ({
      ...prev,
      personality_traits: prev.personality_traits.includes(trait)
        ? prev.personality_traits.filter((t) => t !== trait)
        : [...prev.personality_traits, trait],
    }));
  };

  const toggleTheme = (theme: string) => {
    setSettings((prev) => ({
      ...prev,
      allowed_themes: prev.allowed_themes.includes(theme)
        ? prev.allowed_themes.filter((t) => t !== theme)
        : [...prev.allowed_themes, theme],
    }));
  };

  const toggleArrayItem = (
    key: keyof PhysicalTraits,
    item: string
  ) => {
    setSettings((prev) => {
      const current = (prev.physical_traits[key] as string[]) || [];
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      return {
        ...prev,
        physical_traits: { ...prev.physical_traits, [key]: updated },
      };
    });
  };

  const updatePhysicalTrait = (key: keyof PhysicalTraits, value: string) => {
    setSettings((prev) => ({
      ...prev,
      physical_traits: { ...prev.physical_traits, [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // API call would go here
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="w-8 h-8 text-purple-400" />
            AI Chat Setup
          </h1>
          <p className="text-gray-400 mt-1">
            Configure your AI persona to chat with fans 24/7
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Enable Toggle */}
      <div className="bg-zinc-900 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium">Enable AI Chat</p>
              <p className="text-sm text-gray-400">Let AI respond to fans when you're away</p>
            </div>
          </div>
          <button
            onClick={() => setSettings((p) => ({ ...p, enabled: !p.enabled }))}
            className={`w-14 h-7 rounded-full transition-colors ${
              settings.enabled ? 'bg-purple-500' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.enabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Platform Rules */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-300 mb-1">Platform Rules</p>
          <p className="text-blue-200/80">
            Your AI will follow platform guidelines automatically. It will engage in
            flirty/erotic conversation but won't produce explicit pornographic content.
            It will never claim to be a real person or agree to meet in real life.
          </p>
        </div>
      </div>

      {/* Sections */}
      {settings.enabled && (
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
                  value={settings.persona_name}
                  onChange={(e) => setSettings((p) => ({ ...p, persona_name: e.target.value }))}
                  placeholder="Luna, Aria, etc."
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Persona Age (18+)</label>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={settings.persona_age}
                  onChange={(e) => setSettings((p) => ({ ...p, persona_age: parseInt(e.target.value) || 18 }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Backstory / Lore</label>
              <textarea
                value={settings.backstory}
                onChange={(e) => setSettings((p) => ({ ...p, backstory: e.target.value }))}
                placeholder="A mysterious artist who loves late night conversations..."
                rows={3}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </Section>

          {/* Personality Traits */}
          <Section
            title="Personality Traits"
            icon={Heart}
            expanded={expandedSections.personality}
            onToggle={() => toggleSection('personality')}
          >
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_TRAITS.map((trait) => (
                <button
                  key={trait.id}
                  onClick={() => toggleTrait(trait.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    settings.personality_traits.includes(trait.id)
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                  }`}
                >
                  {trait.emoji} {trait.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Interests & Preferences */}
          <Section
            title="Interests & Preferences"
            icon={MessageCircle}
            expanded={expandedSections.preferences}
            onToggle={() => toggleSection('preferences')}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Interests / Hobbies</label>
                <input
                  type="text"
                  value={settings.interests}
                  onChange={(e) => setSettings((p) => ({ ...p, interests: e.target.value }))}
                  placeholder="Art, music, travel, gaming..."
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Comma separated</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Turn Ons 🔥</label>
                  <input
                    type="text"
                    value={settings.turn_ons}
                    onChange={(e) => setSettings((p) => ({ ...p, turn_ons: e.target.value }))}
                    placeholder="Confidence, humor..."
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Turn Offs 🚫</label>
                  <input
                    type="text"
                    value={settings.turn_offs}
                    onChange={(e) => setSettings((p) => ({ ...p, turn_offs: e.target.value }))}
                    placeholder="Rudeness, impatience..."
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* Allowed Themes */}
          <Section
            title="Allowed Themes"
            icon={Shield}
            expanded={expandedSections.themes}
            onToggle={() => toggleSection('themes')}
          >
            <p className="text-sm text-gray-400 mb-3">
              Select what your AI can engage with
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {ALLOWED_THEMES.map((theme) => (
                <button
                  key={theme}
                  onClick={() => toggleTheme(theme)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    settings.allowed_themes.includes(theme)
                      ? 'bg-pink-500 text-white'
                      : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hard Boundaries</label>
              <textarea
                value={settings.hard_boundaries}
                onChange={(e) => setSettings((p) => ({ ...p, hard_boundaries: e.target.value }))}
                placeholder="Topics your AI will refuse to engage with (one per line)..."
                rows={3}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </Section>

          {/* Physical Traits */}
          <Section
            title="Physical & Style Traits"
            icon={Palette}
            expanded={expandedSections.physical}
            onToggle={() => toggleSection('physical')}
            badge="NEW"
          >
            <p className="text-sm text-gray-400 mb-4">
              Optional details your AI can mention naturally when asked. These won't be
              dumped all at once — the AI responds conversationally.
            </p>

            <div className="space-y-6">
              {/* Body Traits */}
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-3">Body</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Height</label>
                    <input
                      type="text"
                      value={settings.physical_traits.height_range || ''}
                      onChange={(e) => updatePhysicalTrait('height_range', e.target.value)}
                      placeholder="5'4 - 5'6"
                      className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Body Type</label>
                    <select
                      value={settings.physical_traits.body_type || ''}
                      onChange={(e) => updatePhysicalTrait('body_type', e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Select...</option>
                      {BODY_TYPES.map((bt) => (
                        <option key={bt.value} value={bt.value}>{bt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dress Size</label>
                    <input
                      type="text"
                      value={settings.physical_traits.dress_size || ''}
                      onChange={(e) => updatePhysicalTrait('dress_size', e.target.value)}
                      placeholder="6, 8, S, M"
                      className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Shoe Size</label>
                    <input
                      type="text"
                      value={settings.physical_traits.shoe_size || ''}
                      onChange={(e) => updatePhysicalTrait('shoe_size', e.target.value)}
                      placeholder="5, 6"
                      className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-gray-400 mb-1">
                    Breast Size <span className="text-gray-500">(optional, kept tasteful)</span>
                  </label>
                  <input
                    type="text"
                    value={settings.physical_traits.breast_size || ''}
                    onChange={(e) => updatePhysicalTrait('breast_size', e.target.value)}
                    placeholder="B, C, D"
                    className="w-full max-w-[200px] px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    AI will answer: "A C — balanced and easy to style"
                  </p>
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-3">Features</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Hair Colour</label>
                    <input
                      type="text"
                      value={settings.physical_traits.hair_colour || ''}
                      onChange={(e) => updatePhysicalTrait('hair_colour', e.target.value)}
                      placeholder="Dark brown, Blonde"
                      className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Eye Colour</label>
                    <input
                      type="text"
                      value={settings.physical_traits.eye_colour || ''}
                      onChange={(e) => updatePhysicalTrait('eye_colour', e.target.value)}
                      placeholder="Green, Hazel"
                      className="w-full px-3 py-2 bg-zinc-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Fashion Aesthetic */}
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-3">Fashion Aesthetic</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {AESTHETIC_OPTIONS.map((aesthetic) => (
                    <button
                      key={aesthetic}
                      onClick={() => updatePhysicalTrait('fashion_aesthetic', aesthetic)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        settings.physical_traits.fashion_aesthetic === aesthetic
                          ? 'bg-purple-500 text-white'
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
                <h4 className="text-sm font-medium text-purple-400 mb-3">Favourite Outfits</h4>
                <div className="flex flex-wrap gap-2">
                  {OUTFIT_OPTIONS.map((outfit) => (
                    <button
                      key={outfit}
                      onClick={() => toggleArrayItem('favourite_outfits', outfit)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        (settings.physical_traits.favourite_outfits || []).includes(outfit)
                          ? 'bg-pink-500 text-white'
                          : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      }`}
                    >
                      {outfit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lingerie Styles */}
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-3">Lingerie Styles</h4>
                <div className="flex flex-wrap gap-2">
                  {LINGERIE_STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => toggleArrayItem('favourite_lingerie_styles', style)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        (settings.physical_traits.favourite_lingerie_styles || []).includes(style)
                          ? 'bg-pink-500 text-white'
                          : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lingerie Colours */}
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-3">Lingerie Colours</h4>
                <div className="flex flex-wrap gap-2">
                  {LINGERIE_COLOURS.map((colour) => (
                    <button
                      key={colour}
                      onClick={() => toggleArrayItem('favourite_lingerie_colours', colour)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        (settings.physical_traits.favourite_lingerie_colours || []).includes(colour)
                          ? 'bg-pink-500 text-white'
                          : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      }`}
                    >
                      {colour}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-white/5">
              <p className="text-sm font-medium mb-3 text-gray-300">
                Preview: How AI might respond
              </p>
              <div className="space-y-2 text-sm">
                {settings.physical_traits.dress_size && (
                  <div className="p-2 bg-white/5 rounded">
                    <span className="text-gray-400">"What's your dress size?"</span>
                    <p className="text-white mt-1">
                      More of a {settings.physical_traits.dress_size} — fitted, clean lines.
                    </p>
                  </div>
                )}
                {settings.physical_traits.favourite_lingerie_colours?.length ? (
                  <div className="p-2 bg-white/5 rounded">
                    <span className="text-gray-400">"Favourite lingerie colour?"</span>
                    <p className="text-white mt-1">
                      {settings.physical_traits.favourite_lingerie_colours[0] === 'Black'
                        ? 'Black always wins.'
                        : `Deep colours — ${settings.physical_traits.favourite_lingerie_colours.slice(0, 2).join(', ')}, confident tones.`}
                    </p>
                  </div>
                ) : null}
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
                  value={settings.response_length}
                  onChange={(e) => setSettings((p) => ({ ...p, response_length: e.target.value as any }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Emoji Usage</label>
                <select
                  value={settings.emoji_usage}
                  onChange={(e) => setSettings((p) => ({ ...p, emoji_usage: e.target.value as any }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
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
            title="AI Chat Pricing"
            icon={PoundSterling}
            expanded={expandedSections.pricing}
            onToggle={() => toggleSection('pricing')}
          >
            <div className="space-y-3">
              <label
                className={`block p-4 rounded-lg border cursor-pointer transition ${
                  settings.pricing_model === 'included'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 bg-zinc-800 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="pricing"
                    checked={settings.pricing_model === 'included'}
                    onChange={() => setSettings((p) => ({ ...p, pricing_model: 'included' }))}
                    className="w-4 h-4 text-purple-500"
                  />
                  <div>
                    <p className="font-medium">Included in subscription</p>
                    <p className="text-sm text-gray-400">Subscribers chat for free</p>
                  </div>
                </div>
              </label>

              <label
                className={`block p-4 rounded-lg border cursor-pointer transition ${
                  settings.pricing_model === 'per_message'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 bg-zinc-800 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="pricing"
                      checked={settings.pricing_model === 'per_message'}
                      onChange={() => setSettings((p) => ({ ...p, pricing_model: 'per_message' }))}
                      className="w-4 h-4 text-purple-500"
                    />
                    <div>
                      <p className="font-medium">Per message</p>
                      <p className="text-sm text-gray-400">Charge per AI response</p>
                    </div>
                  </div>
                  {settings.pricing_model === 'per_message' && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">£</span>
                      <input
                        type="number"
                        min={0.10}
                        step={0.10}
                        value={settings.price_per_message}
                        onChange={(e) => setSettings((p) => ({ ...p, price_per_message: parseFloat(e.target.value) || 0 }))}
                        className="w-20 px-3 py-1.5 bg-zinc-700 border border-white/10 rounded-lg text-center focus:outline-none focus:border-purple-500"
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
          <Icon className="w-5 h-5 text-purple-400" />
          <span className="font-medium">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full">
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

// Import for icon
function PoundSterling({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 18H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </svg>
  );
}

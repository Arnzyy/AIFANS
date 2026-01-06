'use client';

import { useState } from 'react';
import { Sparkles, Save, ChevronDown, ChevronUp, Info } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface PhysicalTraits {
  height_range?: string;
  body_type?: BodyType;
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
  skin_tone?: string;
  distinguishing_features?: string[];
}

type BodyType = 'slim' | 'athletic' | 'curvy' | 'petite' | 'hourglass' | 'natural';

interface PhysicalTraitsEditorProps {
  initialTraits?: PhysicalTraits;
  onSave: (traits: PhysicalTraits) => Promise<void>;
}

// ===========================================
// OPTIONS
// ===========================================

const BODY_TYPES: { value: BodyType; label: string; description: string }[] = [
  { value: 'slim', label: 'Slim', description: 'Lean and graceful' },
  { value: 'athletic', label: 'Athletic', description: 'Toned and strong' },
  { value: 'curvy', label: 'Curvy', description: 'Soft curves in the right places' },
  { value: 'petite', label: 'Petite', description: 'Delicate and compact' },
  { value: 'hourglass', label: 'Hourglass', description: 'Balanced proportions' },
  { value: 'natural', label: 'Natural', description: 'Effortlessly comfortable' },
];

const OUTFIT_SUGGESTIONS = [
  'Bodysuits', 'Fitted dresses', 'Matching sets', 'Oversized shirts',
  'High-waisted jeans', 'Mini skirts', 'Crop tops', 'Blazers',
  'Sundresses', 'Athleisure', 'Silk blouses', 'Leather jackets',
];

const LINGERIE_STYLE_SUGGESTIONS = [
  'Lace', 'Silk', 'Minimal', 'Strappy', 'Classic', 'Sheer',
  'Sporty', 'Vintage', 'Bold', 'Delicate', 'Matching sets',
];

const LINGERIE_COLOUR_SUGGESTIONS = [
  'Black', 'White', 'Red', 'Wine', 'Blush pink', 'Navy',
  'Deep green', 'Nude', 'Champagne', 'Burgundy', 'Ivory',
];

const AESTHETIC_SUGGESTIONS = [
  'Minimal chic', 'Bold glamour', 'Soft feminine', 'Edgy',
  'Classic elegance', 'Boho', 'Sporty luxe', 'Dark romantic',
];

const STYLING_DESCRIPTORS = [
  'Elegant', 'Intentional', 'Confident', 'Effortless', 'Bold',
  'Soft', 'Playful', 'Sophisticated', 'Sexy', 'Natural',
];

// ===========================================
// MAIN COMPONENT
// ===========================================

export function PhysicalTraitsEditor({ initialTraits, onSave }: PhysicalTraitsEditorProps) {
  const [traits, setTraits] = useState<PhysicalTraits>(initialTraits || {});
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    body: true,
    style: false,
    features: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(traits);
    } finally {
      setSaving(false);
    }
  };

  const updateTrait = <K extends keyof PhysicalTraits>(key: K, value: PhysicalTraits[K]) => {
    setTraits(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: keyof PhysicalTraits, item: string) => {
    const current = (traits[key] as string[]) || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updateTrait(key, updated as any);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Physical & Style Traits
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Optional details your AI can mention naturally in conversation
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200">
          <p className="font-medium mb-1">How this works</p>
          <p className="text-blue-300">
            These traits are treated as natural characteristics of your persona. 
            The AI will mention them casually when asked — never robotic, never listing everything at once.
            All traits are optional.
          </p>
        </div>
      </div>

      {/* Body Section */}
      <Section
        title="Body Traits"
        expanded={expandedSections.body}
        onToggle={() => toggleSection('body')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Height */}
          <div>
            <label className="block text-sm font-medium mb-2">Height Range</label>
            <input
              type="text"
              value={traits.height_range || ''}
              onChange={e => updateTrait('height_range', e.target.value)}
              placeholder="e.g. 5'4 - 5'6 or 'petite'"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Body Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Body Type</label>
            <select
              value={traits.body_type || ''}
              onChange={e => updateTrait('body_type', e.target.value as BodyType)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="">Select...</option>
              {BODY_TYPES.map(bt => (
                <option key={bt.value} value={bt.value}>
                  {bt.label} — {bt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Dress Size */}
          <div>
            <label className="block text-sm font-medium mb-2">Dress Size</label>
            <input
              type="text"
              value={traits.dress_size || ''}
              onChange={e => updateTrait('dress_size', e.target.value)}
              placeholder="e.g. 6, 8, S, M"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Shoe Size */}
          <div>
            <label className="block text-sm font-medium mb-2">Shoe Size</label>
            <input
              type="text"
              value={traits.shoe_size || ''}
              onChange={e => updateTrait('shoe_size', e.target.value)}
              placeholder="e.g. 5, 6, 7"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Breast Size */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Breast Size
              <span className="text-gray-500 font-normal ml-2">(optional, kept tasteful)</span>
            </label>
            <input
              type="text"
              value={traits.breast_size || ''}
              onChange={e => updateTrait('breast_size', e.target.value)}
              placeholder="e.g. B, C, D"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              AI will answer neutrally: "A C — balanced and easy to style"
            </p>
          </div>
        </div>
      </Section>

      {/* Style Section */}
      <Section
        title="Style & Fashion"
        expanded={expandedSections.style}
        onToggle={() => toggleSection('style')}
      >
        <div className="space-y-4">
          {/* Fashion Aesthetic */}
          <div>
            <label className="block text-sm font-medium mb-2">Fashion Aesthetic</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {AESTHETIC_SUGGESTIONS.map(aesthetic => (
                <button
                  key={aesthetic}
                  onClick={() => updateTrait('fashion_aesthetic', aesthetic)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    traits.fashion_aesthetic === aesthetic
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {aesthetic}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={traits.fashion_aesthetic || ''}
              onChange={e => updateTrait('fashion_aesthetic', e.target.value)}
              placeholder="Or type your own..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Favourite Outfits */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Favourite Outfits
              <span className="text-gray-500 font-normal ml-2">
                ({(traits.favourite_outfits || []).length}/10)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {OUTFIT_SUGGESTIONS.map(outfit => (
                <button
                  key={outfit}
                  onClick={() => toggleArrayItem('favourite_outfits', outfit)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    (traits.favourite_outfits || []).includes(outfit)
                      ? 'bg-pink-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {outfit}
                </button>
              ))}
            </div>
          </div>

          {/* Lingerie Styles */}
          <div>
            <label className="block text-sm font-medium mb-2">Favourite Lingerie Styles</label>
            <div className="flex flex-wrap gap-2">
              {LINGERIE_STYLE_SUGGESTIONS.map(style => (
                <button
                  key={style}
                  onClick={() => toggleArrayItem('favourite_lingerie_styles', style)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    (traits.favourite_lingerie_styles || []).includes(style)
                      ? 'bg-pink-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Lingerie Colours */}
          <div>
            <label className="block text-sm font-medium mb-2">Favourite Lingerie Colours</label>
            <div className="flex flex-wrap gap-2">
              {LINGERIE_COLOUR_SUGGESTIONS.map(colour => (
                <button
                  key={colour}
                  onClick={() => toggleArrayItem('favourite_lingerie_colours', colour)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    (traits.favourite_lingerie_colours || []).includes(colour)
                      ? 'bg-pink-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {colour}
                </button>
              ))}
            </div>
          </div>

          {/* Styling Descriptors */}
          <div>
            <label className="block text-sm font-medium mb-2">Styling Descriptors</label>
            <div className="flex flex-wrap gap-2">
              {STYLING_DESCRIPTORS.map(desc => (
                <button
                  key={desc}
                  onClick={() => toggleArrayItem('styling_descriptors', desc)}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    (traits.styling_descriptors || []).includes(desc)
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {desc}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Features Section */}
      <Section
        title="Additional Features"
        expanded={expandedSections.features}
        onToggle={() => toggleSection('features')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hair Colour */}
          <div>
            <label className="block text-sm font-medium mb-2">Hair Colour</label>
            <input
              type="text"
              value={traits.hair_colour || ''}
              onChange={e => updateTrait('hair_colour', e.target.value)}
              placeholder="e.g. Dark brown, Blonde, Auburn"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Eye Colour */}
          <div>
            <label className="block text-sm font-medium mb-2">Eye Colour</label>
            <input
              type="text"
              value={traits.eye_colour || ''}
              onChange={e => updateTrait('eye_colour', e.target.value)}
              placeholder="e.g. Green, Hazel, Dark brown"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Skin Tone */}
          <div>
            <label className="block text-sm font-medium mb-2">Skin Tone</label>
            <input
              type="text"
              value={traits.skin_tone || ''}
              onChange={e => updateTrait('skin_tone', e.target.value)}
              placeholder="e.g. Fair, Olive, Warm tan"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Distinguishing Features */}
          <div>
            <label className="block text-sm font-medium mb-2">Distinguishing Features</label>
            <input
              type="text"
              value={(traits.distinguishing_features || []).join(', ')}
              onChange={e => updateTrait('distinguishing_features', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="e.g. Freckles, Dimples, Beauty mark"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
          </div>
        </div>
      </Section>

      {/* Preview */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h3 className="font-medium mb-3">Preview: How AI might respond</h3>
        <div className="space-y-3 text-sm">
          {traits.dress_size && (
            <PreviewResponse
              question="What's your dress size?"
              answer={`More of a ${traits.dress_size} — fitted, clean lines.`}
            />
          )}
          {traits.favourite_lingerie_colours?.length ? (
            <PreviewResponse
              question="What's your favourite lingerie colour?"
              answer={
                traits.favourite_lingerie_colours[0] === 'Black'
                  ? "Black always wins."
                  : `Deep colours — ${traits.favourite_lingerie_colours.slice(0, 2).join(', ')}, confident tones.`
              }
            />
          ) : null}
          {traits.breast_size && (
            <PreviewResponse
              question="What's your bra size?"
              answer={`A ${traits.breast_size} — balanced and easy to style.`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// SUB COMPONENTS
// ===========================================

function Section({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
      >
        <h3 className="font-medium">{title}</h3>
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

function PreviewResponse({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-3">
      <p className="text-gray-400 mb-1">"{question}"</p>
      <p className="text-white">{answer}</p>
    </div>
  );
}

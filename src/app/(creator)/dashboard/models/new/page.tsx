'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Sparkles,
  MessageSquare,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
} from 'lucide-react';

type WizardStep = 'basic' | 'persona' | 'chat' | 'pricing' | 'review';

const wizardSteps = [
  { id: 'basic' as WizardStep, label: 'Basic Info', icon: User },
  { id: 'persona' as WizardStep, label: 'Persona', icon: Sparkles },
  { id: 'chat' as WizardStep, label: 'Chat Settings', icon: MessageSquare },
  { id: 'pricing' as WizardStep, label: 'Pricing', icon: DollarSign },
  { id: 'review' as WizardStep, label: 'Review', icon: Check },
] as const;

const personalityTraits = [
  'Flirty', 'Playful', 'Sweet', 'Confident', 'Shy',
  'Intellectual', 'Mysterious', 'Romantic', 'Caring',
  'Witty', 'Adventurous', 'Creative', 'Bold', 'Dominant', 'Submissive',
];

const interests = [
  'Fashion', 'Music', 'Art', 'Gaming', 'Fitness',
  'Travel', 'Cooking', 'Movies', 'Reading', 'Photography',
  'Dancing', 'Nature', 'Technology', 'Sports', 'Anime',
];

export default function NewModelPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Basic
    name: '',
    age: 21,
    bio: '',
    avatar_url: '',

    // Persona
    personality_traits: [] as string[],
    interests: [] as string[],
    backstory: '',
    speaking_style: '',

    // Chat
    nsfw_enabled: true,
    sfw_enabled: true,
    default_chat_mode: 'sfw' as 'nsfw' | 'sfw',
    emoji_usage: 'moderate' as 'none' | 'minimal' | 'moderate' | 'heavy',
    response_length: 'medium' as 'short' | 'medium' | 'long',
    turn_ons: [] as string[],
    turn_offs: [] as string[],

    // Pricing
    subscription_price: 999, // £9.99
    price_per_message: 0,
  });

  const stepIndex = wizardSteps.findIndex(s => s.id === currentStep);

  const goNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < wizardSteps.length) {
      setCurrentStep(wizardSteps[nextIndex].id);
    }
  };

  const goBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(wizardSteps[prevIndex].id);
    }
  };

  const toggleArrayItem = (field: 'personality_traits' | 'interests', item: string) => {
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(item)) {
        return { ...prev, [field]: current.filter(i => i !== item) };
      } else {
        return { ...prev, [field]: [...current, item] };
      }
    });
  };

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch('/api/creator/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create model');
      }

      router.push(`/dashboard/models/${data.model.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'basic':
        return formData.name.length >= 2 && formData.age >= 18;
      case 'persona':
        return formData.personality_traits.length >= 1;
      case 'chat':
        return formData.nsfw_enabled || formData.sfw_enabled;
      case 'pricing':
        return formData.subscription_price >= 0;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/models"
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Model</h1>
          <p className="text-zinc-400">Build your AI persona</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {wizardSteps.map((step, index) => {
          const isCompleted = index < stepIndex;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => index <= stepIndex && setCurrentStep(step.id)}
                disabled={index > stepIndex}
                className={`
                  flex flex-col items-center
                  ${isCurrent ? 'text-purple-400' : isCompleted ? 'text-green-400' : 'text-zinc-600'}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2
                  ${isCurrent ? 'bg-purple-600' : isCompleted ? 'bg-green-600' : 'bg-zinc-800'}
                `}>
                  {isCompleted ? <Check size={20} /> : <step.icon size={20} />}
                </div>
                <span className="text-xs hidden sm:block">{step.label}</span>
              </button>

              {index < wizardSteps.length - 1 && (
                <div className={`
                  w-8 sm:w-16 h-0.5 mx-2
                  ${index < stepIndex ? 'bg-green-600' : 'bg-zinc-800'}
                `} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-zinc-900 rounded-xl p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {currentStep === 'basic' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Basic Information</h2>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                placeholder="Luna, Aria, Max..."
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Age * (18+)</label>
              <input
                type="number"
                min={18}
                max={99}
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 18 }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none"
                rows={3}
                placeholder="A short description of your model..."
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Avatar URL (optional)</label>
              <input
                type="url"
                value={formData.avatar_url}
                onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                placeholder="https://..."
              />
              <p className="text-xs text-zinc-500 mt-1">You can add this later</p>
            </div>
          </div>
        )}

        {currentStep === 'persona' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Persona</h2>

            <div>
              <label className="block text-sm text-zinc-400 mb-3">
                Personality Traits * (select at least 1)
              </label>
              <div className="flex flex-wrap gap-2">
                {personalityTraits.map((trait) => (
                  <button
                    key={trait}
                    onClick={() => toggleArrayItem('personality_traits', trait)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm transition-colors
                      ${formData.personality_traits.includes(trait)
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }
                    `}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-3">Interests</label>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleArrayItem('interests', interest)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm transition-colors
                      ${formData.interests.includes(interest)
                        ? 'bg-pink-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }
                    `}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Backstory</label>
              <textarea
                value={formData.backstory}
                onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none"
                rows={4}
                placeholder="Tell the AI about your model's background..."
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Speaking Style</label>
              <input
                type="text"
                value={formData.speaking_style}
                onChange={(e) => setFormData(prev => ({ ...prev, speaking_style: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                placeholder="e.g., playful and teasing, uses lots of emojis"
              />
            </div>
          </div>
        )}

        {currentStep === 'chat' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Chat Settings</h2>

            <div>
              <label className="block text-sm text-zinc-400 mb-3">Chat Modes *</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 bg-zinc-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.nsfw_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, nsfw_enabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium">NSFW Mode</span>
                    <p className="text-sm text-zinc-400">Adult-oriented flirty chat</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-zinc-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sfw_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, sfw_enabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="font-medium">SFW/Companion Mode</span>
                    <p className="text-sm text-zinc-400">Friendly, supportive chat</p>
                  </div>
                </label>
              </div>
            </div>

            {formData.nsfw_enabled && formData.sfw_enabled && (
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Default Mode</label>
                <select
                  value={formData.default_chat_mode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    default_chat_mode: e.target.value as 'nsfw' | 'sfw'
                  }))}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                >
                  <option value="sfw">SFW/Companion</option>
                  <option value="nsfw">NSFW</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Emoji Usage</label>
              <select
                value={formData.emoji_usage}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  emoji_usage: e.target.value as typeof formData.emoji_usage
                }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
              >
                <option value="none">None</option>
                <option value="minimal">Minimal</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Response Length</label>
              <select
                value={formData.response_length}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  response_length: e.target.value as typeof formData.response_length
                }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
              >
                <option value="short">Short (1-2 sentences)</option>
                <option value="medium">Medium (2-4 sentences)</option>
                <option value="long">Long (detailed responses)</option>
              </select>
            </div>
          </div>
        )}

        {currentStep === 'pricing' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Pricing</h2>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Monthly Subscription Price (£)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">£</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={(formData.subscription_price / 100).toFixed(2)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    subscription_price: Math.round(parseFloat(e.target.value || '0') * 100)
                  }))}
                  className="w-full pl-8 pr-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                You earn 70% = £{((formData.subscription_price * 0.7) / 100).toFixed(2)} per subscriber
              </p>
            </div>

            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <h3 className="font-medium mb-2">Recommended Pricing</h3>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>• Entry level: £4.99 - £9.99/month</li>
                <li>• Standard: £9.99 - £19.99/month</li>
                <li>• Premium: £19.99 - £49.99/month</li>
              </ul>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Review Your Model</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-zinc-800 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt=""
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-2xl font-bold">{formData.name.charAt(0) || '?'}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{formData.name || 'Unnamed'}</h3>
                  <p className="text-zinc-400">Age: {formData.age}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-800 rounded-lg">
                  <h4 className="text-sm text-zinc-400 mb-2">Personality</h4>
                  <div className="flex flex-wrap gap-1">
                    {formData.personality_traits.map((trait) => (
                      <span key={trait} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-zinc-800 rounded-lg">
                  <h4 className="text-sm text-zinc-400 mb-2">Chat Modes</h4>
                  <div className="flex gap-2">
                    {formData.nsfw_enabled && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">NSFW</span>
                    )}
                    {formData.sfw_enabled && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">SFW</span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-zinc-800 rounded-lg">
                  <h4 className="text-sm text-zinc-400 mb-2">Price</h4>
                  <p className="font-medium">£{(formData.subscription_price / 100).toFixed(2)}/month</p>
                </div>

                <div className="p-4 bg-zinc-800 rounded-lg">
                  <h4 className="text-sm text-zinc-400 mb-2">Your Earnings</h4>
                  <p className="font-medium text-green-400">
                    £{((formData.subscription_price * 0.7) / 100).toFixed(2)}/subscriber
                  </p>
                </div>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h4 className="font-medium text-yellow-400 mb-1">What happens next?</h4>
                <p className="text-sm text-zinc-400">
                  Your model will be saved as a draft. You can continue editing and submit it for review when ready.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className="px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft size={18} />
            Back
          </button>

          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Creating...
                </>
              ) : (
                <>
                  Create Model
                  <Check size={18} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="px-6 py-2 bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              Continue
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

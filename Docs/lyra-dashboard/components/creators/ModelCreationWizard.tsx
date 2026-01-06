'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Image as ImageIcon,
  Palette,
  DollarSign,
  Send,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Upload,
} from 'lucide-react';
import {
  CreatorModel,
  ModelStep1Data,
  ModelStep2Data,
  ModelStep3Data,
  ModelStep4Data,
  getStatusColor,
} from '@/lib/creators/types';
import { TagSelector } from '@/components/tags/TagSelector';

// ===========================================
// MAIN WIZARD COMPONENT
// ===========================================

interface ModelCreationWizardProps {
  existingModel?: CreatorModel;
  onComplete?: (model: CreatorModel) => void;
}

export function ModelCreationWizard({ existingModel, onComplete }: ModelCreationWizardProps) {
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [model, setModel] = useState<Partial<CreatorModel>>(existingModel || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(existingModel?.id || null);

  const totalSteps = 5;

  const saveStep = async (stepData: any, nextStep: number) => {
    setSaving(true);
    setError(null);

    try {
      if (!modelId) {
        // Create new model
        const response = await fetch('/api/creator/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stepData),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        setModelId(result.model.id);
        setModel(result.model);
      } else {
        // Update existing model
        const response = await fetch(`/api/creator/models/${modelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: currentStep, data: stepData }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        setModel(result.model);
      }

      setCurrentStep(nextStep);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!modelId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/creator/models/${modelId}/submit`, {
        method: 'POST',
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      if (onComplete) {
        onComplete(result.model);
      } else {
        router.push('/dashboard/models');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <ModelProgressSteps currentStep={currentStep} totalSteps={totalSteps} />

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-zinc-900 rounded-2xl p-6">
        {currentStep === 1 && (
          <ModelStep1Basics
            model={model}
            onSave={(data) => saveStep(data, 2)}
            saving={saving}
          />
        )}
        {currentStep === 2 && (
          <ModelStep2Visuals
            model={model}
            onSave={(data) => saveStep(data, 3)}
            onBack={() => setCurrentStep(1)}
            saving={saving}
          />
        )}
        {currentStep === 3 && (
          <ModelStep3Persona
            model={model}
            onSave={(data) => saveStep(data, 4)}
            onBack={() => setCurrentStep(2)}
            saving={saving}
          />
        )}
        {currentStep === 4 && (
          <ModelStep4Monetization
            model={model}
            onSave={(data) => saveStep(data, 5)}
            onBack={() => setCurrentStep(3)}
            saving={saving}
          />
        )}
        {currentStep === 5 && (
          <ModelStep5Submit
            model={model}
            onSubmit={submitForReview}
            onBack={() => setCurrentStep(4)}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

// ===========================================
// PROGRESS STEPS
// ===========================================

function ModelProgressSteps({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = [
    { num: 1, label: 'Basics', icon: User },
    { num: 2, label: 'Visuals', icon: ImageIcon },
    { num: 3, label: 'Persona', icon: Palette },
    { num: 4, label: 'Pricing', icon: DollarSign },
    { num: 5, label: 'Submit', icon: Send },
  ];

  return (
    <div className="flex justify-between mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isComplete = currentStep > step.num;
        const isCurrent = currentStep === step.num;

        return (
          <div key={step.num} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-gray-500'
                }`}
              >
                {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs mt-2 ${isCurrent ? 'text-white' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 ${isComplete ? 'bg-green-500' : 'bg-zinc-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===========================================
// STEP 1: BASICS
// ===========================================

function ModelStep1Basics({
  model,
  onSave,
  saving,
}: {
  model: Partial<CreatorModel>;
  onSave: (data: ModelStep1Data) => void;
  saving: boolean;
}) {
  const [displayName, setDisplayName] = useState(model.display_name || '');
  const [age, setAge] = useState(model.age || 21);
  const [primaryLanguage, setPrimaryLanguage] = useState(model.primary_language || 'en');
  const [primaryTagId, setPrimaryTagId] = useState<string | null>(model.primary_tag_id || null);
  const [secondaryTagIds, setSecondaryTagIds] = useState<string[]>([]);
  const [isNsfw, setIsNsfw] = useState(model.nsfw_enabled !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (age < 18) {
      return;
    }

    onSave({
      display_name: displayName,
      age,
      primary_language: primaryLanguage,
      primary_tag_id: primaryTagId || undefined,
      secondary_tag_ids: secondaryTagIds,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-6">Model Basics</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Display Name *</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={100}
          placeholder="e.g., Luna, Aria, Sophie..."
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Age *</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value) || 18)}
            required
            min={18}
            max={99}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
          {age < 18 && (
            <p className="text-xs text-red-400 mt-1">Must be 18 or older</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Primary Language</label>
          <select
            value={primaryLanguage}
            onChange={(e) => setPrimaryLanguage(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
          </select>
        </div>
      </div>

      {/* NSFW Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isNsfw}
            onChange={(e) => setIsNsfw(e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-zinc-700 text-purple-500 focus:ring-purple-500"
          />
          <div>
            <span className="font-medium">Enable NSFW Content</span>
            <p className="text-sm text-gray-400">Allow adult content for this model</p>
          </div>
        </label>
      </div>

      {/* Tag Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Categories & Tags</label>
        <TagSelector
          isNsfw={isNsfw}
          initialPrimaryTagId={primaryTagId || undefined}
          initialSecondaryTagIds={secondaryTagIds}
          onChange={(selection) => {
            setPrimaryTagId(selection?.primary_tag_id || null);
            setSecondaryTagIds(selection?.secondary_tag_ids || []);
          }}
        />
      </div>

      <button
        type="submit"
        disabled={saving || !displayName || age < 18}
        className="w-full py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Continue
            <ChevronRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}

// ===========================================
// STEP 2: VISUALS
// ===========================================

function ModelStep2Visuals({
  model,
  onSave,
  onBack,
  saving,
}: {
  model: Partial<CreatorModel>;
  onSave: (data: ModelStep2Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [avatarUrl, setAvatarUrl] = useState(model.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(model.cover_url || '');
  const [galleryUrls, setGalleryUrls] = useState<string[]>(model.gallery_urls || []);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      avatar_url: avatarUrl,
      cover_url: coverUrl,
      gallery_urls: galleryUrls,
    });
  };

  // In a real app, this would upload to your storage
  const handleFileUpload = async (
    file: File,
    setUrl: (url: string) => void
  ) => {
    setUploading(true);
    try {
      // Placeholder - in production, upload to Supabase Storage or similar
      const fakeUrl = URL.createObjectURL(file);
      setUrl(fakeUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-6">Profile Visuals</h2>

      {/* Avatar */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Profile Picture *</label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-gray-500" />
            )}
          </div>
          <div className="flex-1">
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="Enter image URL or upload"
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Square image recommended (500x500px)</p>
          </div>
        </div>
      </div>

      {/* Cover */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Cover Image (Optional)</label>
        <div className="aspect-[3/1] bg-zinc-800 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center overflow-hidden">
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <ImageIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No cover image</p>
            </div>
          )}
        </div>
        <input
          type="url"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="Enter cover image URL"
          className="w-full px-4 py-2 mt-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
        />
      </div>

      {/* Gallery */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Gallery Preview (Optional)</label>
        <div className="grid grid-cols-4 gap-2">
          {galleryUrls.map((url, index) => (
            <div key={index} className="aspect-square bg-zinc-800 rounded-lg overflow-hidden relative group">
              <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setGalleryUrls((prev) => prev.filter((_, i) => i !== index))}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {galleryUrls.length < 8 && (
            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter image URL:');
                if (url) setGalleryUrls((prev) => [...prev, url]);
              }}
              className="aspect-square bg-zinc-800 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center hover:border-white/30 transition"
            >
              <Plus className="w-6 h-6 text-gray-500" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Add up to 8 preview images</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          type="submit"
          disabled={saving || !avatarUrl}
          className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ===========================================
// STEP 3: PERSONA
// ===========================================

function ModelStep3Persona({
  model,
  onSave,
  onBack,
  saving,
}: {
  model: Partial<CreatorModel>;
  onSave: (data: ModelStep3Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [bio, setBio] = useState(model.bio || '');
  const [tagline, setTagline] = useState(model.tagline || '');
  const [traits, setTraits] = useState<string[]>(model.persona_traits || []);
  const [interests, setInterests] = useState<string[]>(model.interests || []);
  const [newTrait, setNewTrait] = useState('');
  const [newInterest, setNewInterest] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      bio,
      tagline,
      persona_traits: traits,
      interests,
    });
  };

  const addTrait = () => {
    if (newTrait && traits.length < 10) {
      setTraits((prev) => [...prev, newTrait]);
      setNewTrait('');
    }
  };

  const addInterest = () => {
    if (newInterest && interests.length < 10) {
      setInterests((prev) => [...prev, newInterest]);
      setNewInterest('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-6">Persona & Bio</h2>

      {/* Tagline */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Tagline</label>
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={255}
          placeholder="A short catchy description..."
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Bio */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Tell users about your model's personality, background, interests..."
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      {/* Personality Traits */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Personality Traits</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {traits.map((trait, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm flex items-center gap-2"
            >
              {trait}
              <button
                type="button"
                onClick={() => setTraits((prev) => prev.filter((_, i) => i !== index))}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTrait}
            onChange={(e) => setNewTrait(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrait())}
            placeholder="Add a trait..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
          />
          <button
            type="button"
            onClick={addTrait}
            disabled={!newTrait || traits.length >= 10}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interests */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Interests</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {interests.map((interest, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full text-sm flex items-center gap-2"
            >
              {interest}
              <button
                type="button"
                onClick={() => setInterests((prev) => prev.filter((_, i) => i !== index))}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
            placeholder="Add an interest..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
          />
          <button
            type="button"
            onClick={addInterest}
            disabled={!newInterest || interests.length >= 10}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ===========================================
// STEP 4: MONETIZATION
// ===========================================

function ModelStep4Monetization({
  model,
  onSave,
  onBack,
  saving,
}: {
  model: Partial<CreatorModel>;
  onSave: (data: ModelStep4Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [priceMonthly, setPriceMonthly] = useState(model.subscription_price_monthly || 999);
  const [nsfwEnabled, setNsfwEnabled] = useState(model.nsfw_enabled !== false);
  const [sfwEnabled, setSfwEnabled] = useState(model.sfw_enabled !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      subscription_price_monthly: priceMonthly,
      nsfw_enabled: nsfwEnabled,
      sfw_enabled: sfwEnabled,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-6">Monetization</h2>

      {/* Subscription Price */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Monthly Subscription Price</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">£</span>
          <input
            type="number"
            value={(priceMonthly / 100).toFixed(2)}
            onChange={(e) => setPriceMonthly(Math.round(parseFloat(e.target.value) * 100) || 0)}
            min={0.99}
            max={99.99}
            step={0.01}
            className="w-full pl-8 pr-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Subscribers get access to all subscriber-only content and chat
        </p>
      </div>

      {/* Chat Modes */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">Chat Modes</label>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-4 bg-zinc-800 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={sfwEnabled}
              onChange={(e) => setSfwEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-zinc-700 text-purple-500 focus:ring-purple-500"
            />
            <div>
              <span className="font-medium">Companion Mode (SFW)</span>
              <p className="text-sm text-gray-400">Friendly, supportive conversations</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-4 bg-zinc-800 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={nsfwEnabled}
              onChange={(e) => setNsfwEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-zinc-700 text-purple-500 focus:ring-purple-500"
            />
            <div>
              <span className="font-medium">Intimate Mode (NSFW)</span>
              <p className="text-sm text-gray-400">Adult content and flirty conversations</p>
            </div>
          </label>
        </div>
        {!sfwEnabled && !nsfwEnabled && (
          <p className="text-xs text-red-400 mt-2">At least one chat mode must be enabled</p>
        )}
      </div>

      {/* Earnings Info */}
      <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
        <h4 className="font-medium mb-2">Earnings Breakdown</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Subscription price</span>
            <span>£{(priceMonthly / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Platform fee (20%)</span>
            <span>-£{((priceMonthly * 0.2) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-1 font-medium">
            <span>Your earnings</span>
            <span className="text-green-400">£{((priceMonthly * 0.8) / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          type="submit"
          disabled={saving || (!sfwEnabled && !nsfwEnabled)}
          className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ===========================================
// STEP 5: SUBMIT
// ===========================================

function ModelStep5Submit({
  model,
  onSubmit,
  onBack,
  saving,
}: {
  model: Partial<CreatorModel>;
  onSubmit: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Submit for Review</h2>

      {/* Preview Card */}
      <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
            {model.avatar_url && (
              <img src={model.avatar_url} alt={model.display_name} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{model.display_name}</h3>
            <p className="text-sm text-gray-400">{model.tagline || model.bio?.slice(0, 100)}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {model.nsfw_enabled && (
                <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs">NSFW</span>
              )}
              {model.sfw_enabled && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Companion</span>
              )}
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                £{((model.subscription_price_monthly || 0) / 100).toFixed(2)}/mo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          Your model will be reviewed by our team to ensure it meets our guidelines. 
          This usually takes 24-48 hours. You'll be notified once approved.
        </p>
      </div>

      {/* Checklist */}
      <div className="mb-6 space-y-2">
        <ChecklistItem label="Display name set" checked={!!model.display_name} />
        <ChecklistItem label="Age 18+" checked={(model.age || 0) >= 18} />
        <ChecklistItem label="Avatar uploaded" checked={!!model.avatar_url} />
        <ChecklistItem label="At least one chat mode enabled" checked={model.nsfw_enabled || model.sfw_enabled} />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={saving || !model.display_name || !model.avatar_url}
          className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Submit for Review
              <Send className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          checked ? 'bg-green-500' : 'bg-zinc-700'
        }`}
      >
        {checked && <Check className="w-3 h-3" />}
      </div>
      <span className={checked ? 'text-white' : 'text-gray-500'}>{label}</span>
    </div>
  );
}

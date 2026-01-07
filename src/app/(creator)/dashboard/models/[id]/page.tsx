'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';

interface Model {
  id: string;
  name: string;
  age: number;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  personality_traits: string[];
  interests: string[];
  backstory?: string;
  speaking_style?: string;
  turn_ons?: string[];
  turn_offs?: string[];
  emoji_usage: string;
  response_length: string;
  subscription_price: number;
  price_per_message?: number;
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  default_chat_mode: string;
  status: string;
  rejection_reason?: string;
  physical_traits?: {
    hair_color?: string;
    eye_color?: string;
    body_type?: string;
    height?: string;
    ethnicity?: string;
    style?: string;
  };
}

const personalityTraits = [
  'Flirty', 'Playful', 'Sweet', 'Confident', 'Shy',
  'Intellectual', 'Mysterious', 'Romantic', 'Caring',
  'Witty', 'Adventurous', 'Creative', 'Bold', 'Dominant', 'Submissive',
];

const interestOptions = [
  'Fashion', 'Music', 'Art', 'Gaming', 'Fitness',
  'Travel', 'Cooking', 'Movies', 'Reading', 'Photography',
  'Dancing', 'Nature', 'Technology', 'Sports', 'Anime',
];

const hairColors = ['Blonde', 'Brunette', 'Black', 'Red', 'Auburn', 'Silver', 'Pink', 'Blue', 'Purple', 'Multi-colored'];
const eyeColors = ['Blue', 'Green', 'Brown', 'Hazel', 'Grey', 'Amber', 'Violet'];
const bodyTypes = ['Slim', 'Athletic', 'Curvy', 'Petite', 'Tall', 'Average', 'Muscular'];
const ethnicities = ['Caucasian', 'Asian', 'Black', 'Latina', 'Middle Eastern', 'Mixed', 'Other'];
const styles = ['Casual', 'Elegant', 'Sporty', 'Gothic', 'Bohemian', 'Professional', 'Glamorous', 'Alternative'];

const turnOnSuggestions = [
  'Confidence', 'Intelligence', 'Humor', 'Romance', 'Adventure',
  'Deep conversations', 'Teasing', 'Compliments', 'Mystery', 'Playfulness',
  'Ambition', 'Creativity', 'Fitness', 'Good manners', 'Spontaneity',
];

const turnOffSuggestions = [
  'Rudeness', 'Arrogance', 'Dishonesty', 'Impatience', 'Negativity',
  'Being ignored', 'Bad hygiene', 'Disrespect', 'Boring conversations', 'Pushiness',
];

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-zinc-500/20 text-zinc-400', icon: Clock },
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: XCircle },
} as const;

export default function EditModelPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.id as string;

  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Model>>({});
  const [newTurnOn, setNewTurnOn] = useState('');
  const [newTurnOff, setNewTurnOff] = useState('');

  useEffect(() => {
    fetchModel();
  }, [modelId]);

  const addTurnOn = (value: string) => {
    if (!value.trim()) return;
    const current = formData.turn_ons || [];
    if (!current.includes(value.trim())) {
      setFormData(prev => ({ ...prev, turn_ons: [...current, value.trim()] }));
    }
    setNewTurnOn('');
  };

  const removeTurnOn = (value: string) => {
    setFormData(prev => ({
      ...prev,
      turn_ons: (prev.turn_ons || []).filter(t => t !== value)
    }));
  };

  const addTurnOff = (value: string) => {
    if (!value.trim()) return;
    const current = formData.turn_offs || [];
    if (!current.includes(value.trim())) {
      setFormData(prev => ({ ...prev, turn_offs: [...current, value.trim()] }));
    }
    setNewTurnOff('');
  };

  const removeTurnOff = (value: string) => {
    setFormData(prev => ({
      ...prev,
      turn_offs: (prev.turn_offs || []).filter(t => t !== value)
    }));
  };

  const updatePhysicalTrait = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      physical_traits: {
        ...(prev.physical_traits || {}),
        [key]: value
      }
    }));
  };

  const fetchModel = async () => {
    try {
      const res = await fetch(`/api/creator/models/${modelId}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setModel(data.model);
      setFormData(data.model);
    } catch (err) {
      setError('Failed to load model');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/creator/models/${modelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setModel(data.model);
      setSuccessMessage('Changes saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!confirm('Submit this model for review? You won\'t be able to edit it until review is complete.')) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Save first
      await handleSave();

      // Then submit
      const res = await fetch(`/api/creator/models/${modelId}/submit`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      setModel(data.model);
      setSuccessMessage('Model submitted for review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleArrayItem = (field: 'personality_traits' | 'interests', item: string) => {
    setFormData(prev => {
      const current = (prev[field] as string[]) || [];
      if (current.includes(item)) {
        return { ...prev, [field]: current.filter(i => i !== item) };
      } else {
        return { ...prev, [field]: [...current, item] };
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">{error || 'Model not found'}</p>
        <Link href="/dashboard/models" className="text-purple-400 hover:underline mt-2 block">
          Back to models
        </Link>
      </div>
    );
  }

  const statusInfo = statusConfig[model.status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;
  const canEdit = model.status === 'draft' || model.status === 'rejected';
  const canSubmit = canEdit && formData.name && formData.age && formData.age >= 18 &&
    ((formData.personality_traits?.length || 0) > 0) &&
    (formData.nsfw_enabled || formData.sfw_enabled);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/models"
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{model.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${statusInfo.color}`}>
                <StatusIcon size={12} />
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save
            </button>
          )}
          {canSubmit && (
            <button
              onClick={handleSubmitForReview}
              disabled={submitting}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Submit for Review
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-2">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 flex items-center gap-2">
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}

      {model.status === 'rejected' && model.rejection_reason && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3 className="font-medium text-red-400 mb-1">Rejection Reason</h3>
          <p className="text-sm text-zinc-400">{model.rejection_reason}</p>
          <p className="text-sm text-zinc-500 mt-2">
            Please address the issues and resubmit for review.
          </p>
        </div>
      )}

      {model.status === 'pending_review' && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <h3 className="font-medium text-yellow-400 mb-1">Under Review</h3>
          <p className="text-sm text-zinc-400">
            Your model is being reviewed by our team. This usually takes 24-48 hours.
          </p>
        </div>
      )}

      {/* Form */}
      <div className="space-y-8">
        {/* Images */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Images</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Avatar</label>
              <ImageUpload
                value={formData.avatar_url}
                onChange={(url) => setFormData(prev => ({ ...prev, avatar_url: url }))}
                onRemove={() => setFormData(prev => ({ ...prev, avatar_url: '' }))}
                aspectRatio="square"
                placeholder="Upload avatar image"
                disabled={!canEdit}
                folder="avatars"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Banner</label>
              <ImageUpload
                value={formData.banner_url}
                onChange={(url) => setFormData(prev => ({ ...prev, banner_url: url }))}
                onRemove={() => setFormData(prev => ({ ...prev, banner_url: '' }))}
                aspectRatio="banner"
                placeholder="Upload banner image"
                disabled={!canEdit}
                folder="banners"
              />
            </div>
          </div>
        </section>

        {/* Basic Info */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Age (18+)</label>
                <input
                  type="number"
                  min={18}
                  value={formData.age || 18}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Bio</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                disabled={!canEdit}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50"
                rows={3}
                placeholder="A compelling bio that describes your model's personality..."
              />
            </div>
          </div>
        </section>

        {/* Physical Traits */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Physical Appearance</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Hair Color</label>
              <select
                value={formData.physical_traits?.hair_color || ''}
                onChange={(e) => updatePhysicalTrait('hair_color', e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">Select...</option>
                {hairColors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Eye Color</label>
              <select
                value={formData.physical_traits?.eye_color || ''}
                onChange={(e) => updatePhysicalTrait('eye_color', e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">Select...</option>
                {eyeColors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Body Type</label>
              <select
                value={formData.physical_traits?.body_type || ''}
                onChange={(e) => updatePhysicalTrait('body_type', e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">Select...</option>
                {bodyTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Ethnicity</label>
              <select
                value={formData.physical_traits?.ethnicity || ''}
                onChange={(e) => updatePhysicalTrait('ethnicity', e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">Select...</option>
                {ethnicities.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Style</label>
              <select
                value={formData.physical_traits?.style || ''}
                onChange={(e) => updatePhysicalTrait('style', e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">Select...</option>
                {styles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Height</label>
              <input
                type="text"
                value={formData.physical_traits?.height || ''}
                onChange={(e) => updatePhysicalTrait('height', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g., 5'6&quot; or 168cm"
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </section>

        {/* Persona */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Persona</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-3">Personality Traits</label>
              <div className="flex flex-wrap gap-2">
                {personalityTraits.map((trait) => (
                  <button
                    key={trait}
                    onClick={() => canEdit && toggleArrayItem('personality_traits', trait)}
                    disabled={!canEdit}
                    className={`
                      px-3 py-1.5 rounded-full text-sm transition-colors disabled:cursor-default
                      ${(formData.personality_traits || []).includes(trait)
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:hover:bg-zinc-800'
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
                {interestOptions.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => canEdit && toggleArrayItem('interests', interest)}
                    disabled={!canEdit}
                    className={`
                      px-3 py-1.5 rounded-full text-sm transition-colors disabled:cursor-default
                      ${(formData.interests || []).includes(interest)
                        ? 'bg-pink-600 text-white'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:hover:bg-zinc-800'
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
                value={formData.backstory || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
                disabled={!canEdit}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50"
                rows={4}
                placeholder="Give your model a compelling backstory..."
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Speaking Style</label>
              <input
                type="text"
                value={formData.speaking_style || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, speaking_style: e.target.value }))}
                disabled={!canEdit}
                placeholder="e.g., playful and teasing, uses lots of emojis"
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </section>

        {/* Turn Ons/Offs */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Turn Ons & Turn Offs</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Define what your model finds attractive or unappealing. This helps guide chat behavior.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Turn Ons */}
            <div>
              <label className="block text-sm text-zinc-400 mb-3">Turn Ons 💕</label>

              {/* Selected turn ons */}
              <div className="flex flex-wrap gap-2 mb-3 min-h-[40px]">
                {(formData.turn_ons || []).map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm"
                  >
                    {item}
                    {canEdit && (
                      <button onClick={() => removeTurnOn(item)} className="hover:text-pink-300">
                        <X size={14} />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Add custom */}
              {canEdit && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTurnOn}
                    onChange={(e) => setNewTurnOn(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTurnOn(newTurnOn))}
                    placeholder="Add custom..."
                    className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-sm focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={() => addTurnOn(newTurnOn)}
                    className="px-3 py-2 bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {/* Suggestions */}
              {canEdit && (
                <div className="flex flex-wrap gap-1">
                  {turnOnSuggestions
                    .filter(s => !(formData.turn_ons || []).includes(s))
                    .slice(0, 8)
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => addTurnOn(suggestion)}
                        className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                      >
                        + {suggestion}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Turn Offs */}
            <div>
              <label className="block text-sm text-zinc-400 mb-3">Turn Offs 🚫</label>

              {/* Selected turn offs */}
              <div className="flex flex-wrap gap-2 mb-3 min-h-[40px]">
                {(formData.turn_offs || []).map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm"
                  >
                    {item}
                    {canEdit && (
                      <button onClick={() => removeTurnOff(item)} className="hover:text-red-300">
                        <X size={14} />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {/* Add custom */}
              {canEdit && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTurnOff}
                    onChange={(e) => setNewTurnOff(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTurnOff(newTurnOff))}
                    placeholder="Add custom..."
                    className="flex-1 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 text-sm focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={() => addTurnOff(newTurnOff)}
                    className="px-3 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {/* Suggestions */}
              {canEdit && (
                <div className="flex flex-wrap gap-1">
                  {turnOffSuggestions
                    .filter(s => !(formData.turn_offs || []).includes(s))
                    .slice(0, 8)
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => addTurnOff(suggestion)}
                        className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                      >
                        + {suggestion}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Chat Settings */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Chat Settings</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.nsfw_enabled || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, nsfw_enabled: e.target.checked }))}
                  disabled={!canEdit}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-purple-600"
                />
                <span>NSFW Mode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sfw_enabled || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, sfw_enabled: e.target.checked }))}
                  disabled={!canEdit}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-purple-600"
                />
                <span>SFW/Companion Mode</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Emoji Usage</label>
                <select
                  value={formData.emoji_usage || 'moderate'}
                  onChange={(e) => setFormData(prev => ({ ...prev, emoji_usage: e.target.value }))}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
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
                  value={formData.response_length || 'medium'}
                  onChange={(e) => setFormData(prev => ({ ...prev, response_length: e.target.value }))}
                  disabled={!canEdit}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Pricing</h2>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Subscription Price (£/month)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">£</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={((formData.subscription_price || 0) / 100).toFixed(2)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  subscription_price: Math.round(parseFloat(e.target.value || '0') * 100)
                }))}
                disabled={!canEdit}
                className="w-full pl-8 pr-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              You earn 70% = £{(((formData.subscription_price || 0) * 0.7) / 100).toFixed(2)}/subscriber
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

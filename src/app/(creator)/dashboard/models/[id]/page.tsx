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
} from 'lucide-react';

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

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number }> }> = {
  draft: { label: 'Draft', color: 'bg-zinc-500/20 text-zinc-400', icon: Clock },
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

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

  useEffect(() => {
    fetchModel();
  }, [modelId]);

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

  const statusInfo = statusConfig[model.status] || statusConfig.draft;
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
        {/* Basic Info */}
        <section className="bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
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

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Bio</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                disabled={!canEdit}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Avatar URL</label>
              <input
                type="url"
                value={formData.avatar_url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                disabled={!canEdit}
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
              />
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

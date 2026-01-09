'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Heart,
  Settings,
  Save,
  Info,
  ArrowRight,
  Shield,
  Flame,
  AlertCircle,
  Users,
} from 'lucide-react';

// Types
import { ChatMode } from '@/lib/sfw-chat/types';

interface ChatModeSettings {
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  default_mode: ChatMode;
  linked_model_id: string | null;
}

interface Model {
  id: string;
  name: string;
  avatar_url: string;
  status: string;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function ChatModesPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<Model[]>([]);
  const [settings, setSettings] = useState<ChatModeSettings>({
    nsfw_enabled: false,  // Default: disabled until model linked
    sfw_enabled: false,
    default_mode: 'nsfw',
    linked_model_id: null,
  });

  const [aiPersonalities, setAiPersonalities] = useState<Record<string, boolean>>({});

  // Fetch creator's approved models, chat mode settings, and AI personalities
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch models
        const modelsRes = await fetch('/api/creator/models');
        if (modelsRes.ok) {
          const data = await modelsRes.json();
          const approvedModels = (data.models || []).filter(
            (m: Model) => m.status === 'approved'
          );
          setModels(approvedModels);
        }

        // Fetch chat mode settings
        const settingsRes = await fetch('/api/creator/chat-modes');
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(prev => ({
            ...prev,
            nsfw_enabled: data.nsfw_enabled ?? false,
            sfw_enabled: data.sfw_enabled ?? false,
            default_mode: data.default_mode ?? 'nsfw',
            linked_model_id: data.linked_model_id ?? null,
          }));
        }

        // Fetch AI personalities to see which models have them configured
        const personalitiesRes = await fetch('/api/creator/ai-personality');
        if (personalitiesRes.ok) {
          const data = await personalitiesRes.json();
          const personalities = data.personalities || [];
          const configuredModels: Record<string, boolean> = {};
          personalities.forEach((p: { model_id?: string; is_active?: boolean }) => {
            if (p.model_id) {
              configuredModels[p.model_id] = p.is_active ?? false;
            }
          });
          setAiPersonalities(configuredModels);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Check if user has approved models
  const hasApprovedModels = models.length > 0;
  const selectedModel = models.find(m => m.id === settings.linked_model_id);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/creator/chat-modes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nsfw_enabled: settings.nsfw_enabled,
          sfw_enabled: settings.sfw_enabled,
          default_mode: settings.default_mode,
          linked_model_id: settings.linked_model_id,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      alert('Chat mode settings saved!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Determine if both modes are enabled
  const bothEnabled = settings.nsfw_enabled && settings.sfw_enabled;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="w-8 h-8 text-gray-400" />
            Chat Modes
          </h1>
          <p className="text-gray-400 mt-1">
            Choose which AI chat experiences to offer your subscribers
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* No Models Warning */}
      {!loading && !hasApprovedModels && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium text-yellow-300 mb-1">No Approved Models</p>
            <p>
              You need to create and get a model approved before you can enable AI chat.{' '}
              <Link href="/dashboard/models" className="text-yellow-400 hover:text-yellow-300 underline">
                Create a model
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Model Selector */}
      {hasApprovedModels && (
        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold">Link to Model</h3>
              <p className="text-sm text-gray-400">Select which model this chat configuration is for</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => setSettings(p => ({ ...p, linked_model_id: model.id }))}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition text-left ${
                  settings.linked_model_id === model.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 bg-zinc-800 hover:border-white/20'
                }`}
              >
                <img
                  src={model.avatar_url || '/default-avatar.png'}
                  alt={model.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{model.name}</p>
                  <p className="text-xs text-green-400">Approved</p>
                </div>
                {settings.linked_model_id === model.id && (
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200">
          <p className="font-medium text-blue-300 mb-1">How Chat Modes Work</p>
          <p>
            You can offer NSFW chat, Companion chat, or both. Each mode has its own
            AI personality configuration and pricing. If both are enabled, users
            will see a mode selector on your profile.
          </p>
        </div>
      </div>

      {/* Mode Cards */}
      <div className={`space-y-4 mb-8 ${!settings.linked_model_id ? 'opacity-50' : ''}`}>
        {!settings.linked_model_id && hasApprovedModels && (
          <div className="text-center text-yellow-400 text-sm py-2 bg-yellow-500/10 rounded-lg mb-2">
            Select a model above to enable chat modes
          </div>
        )}
        {/* NSFW Mode */}
        <div className={`bg-zinc-900 rounded-xl p-6 border-2 transition ${
          settings.nsfw_enabled ? 'border-purple-500' : 'border-transparent'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Flame className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">NSFW Chat</h2>
                <p className="text-gray-400 text-sm">Adult, flirty, and erotic conversations</p>
              </div>
            </div>
            <button
              onClick={() => settings.linked_model_id && setSettings((p) => ({ ...p, nsfw_enabled: !p.nsfw_enabled }))}
              disabled={!settings.linked_model_id}
              className={`w-14 h-7 rounded-full transition-colors ${
                settings.nsfw_enabled ? 'bg-purple-500' : 'bg-white/10'
              } ${!settings.linked_model_id ? 'cursor-not-allowed' : ''}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.nsfw_enabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.nsfw_enabled && settings.linked_model_id && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">
                    Configure your NSFW AI personality and pricing
                  </p>
                  {aiPersonalities[settings.linked_model_id] && (
                    <p className="text-xs text-green-400 mt-1">✓ AI personality configured</p>
                  )}
                </div>
                <Link
                  href={`/dashboard/ai-chat?model=${settings.linked_model_id}`}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
                >
                  {aiPersonalities[settings.linked_model_id] ? 'Edit' : 'Setup'} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* SFW / Companion Mode */}
        <div className={`bg-zinc-900 rounded-xl p-6 border-2 transition ${
          settings.sfw_enabled ? 'border-pink-500' : 'border-transparent'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Companion Chat</h2>
                <p className="text-gray-400 text-sm">Friendly, flirty, but SFW conversations</p>
              </div>
            </div>
            <button
              onClick={() => settings.linked_model_id && setSettings((p) => ({ ...p, sfw_enabled: !p.sfw_enabled }))}
              disabled={!settings.linked_model_id}
              className={`w-14 h-7 rounded-full transition-colors ${
                settings.sfw_enabled ? 'bg-pink-500' : 'bg-white/10'
              } ${!settings.linked_model_id ? 'cursor-not-allowed' : ''}`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.sfw_enabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.sfw_enabled && settings.linked_model_id && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Configure your Companion AI personality and pricing
                </p>
                <Link
                  href={`/dashboard/companion-chat?model=${settings.linked_model_id}`}
                  className="text-pink-400 hover:text-pink-300 flex items-center gap-1 text-sm"
                >
                  Setup <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Default Mode Selector (only if both enabled and model linked) */}
      {bothEnabled && settings.linked_model_id && (
        <div className="bg-zinc-900 rounded-xl p-6">
          <h3 className="font-bold mb-2">Default Chat Mode</h3>
          <p className="text-sm text-gray-400 mb-4">
            When users click "Start Chat" on your profile, which mode should open by default?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setSettings((p) => ({ ...p, default_mode: 'nsfw' }))}
              className={`flex-1 p-4 rounded-lg border transition ${
                settings.default_mode === 'nsfw'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 bg-zinc-800 hover:border-white/20'
              }`}
            >
              <Flame className={`w-6 h-6 mb-2 ${
                settings.default_mode === 'nsfw' ? 'text-purple-400' : 'text-gray-400'
              }`} />
              <p className="font-medium">NSFW Chat</p>
            </button>
            <button
              onClick={() => setSettings((p) => ({ ...p, default_mode: 'sfw' }))}
              className={`flex-1 p-4 rounded-lg border transition ${
                settings.default_mode === 'sfw'
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-white/10 bg-zinc-800 hover:border-white/20'
              }`}
            >
              <Heart className={`w-6 h-6 mb-2 ${
                settings.default_mode === 'sfw' ? 'text-pink-400' : 'text-gray-400'
              }`} />
              <p className="font-medium">Companion Chat</p>
            </button>
          </div>
        </div>
      )}

      {/* Warning if model selected but none enabled */}
      {settings.linked_model_id && !settings.nsfw_enabled && !settings.sfw_enabled && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
          <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium text-yellow-300">No chat modes enabled</p>
            <p>
              Enable at least one chat mode to allow subscribers to chat with your AI.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

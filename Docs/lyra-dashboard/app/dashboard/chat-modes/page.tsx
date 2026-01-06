'use client';

import { useState } from 'react';
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
} from 'lucide-react';

// Types
import { ChatMode } from '@/lib/sfw-chat/types';

interface ChatModeSettings {
  nsfw_enabled: boolean;
  sfw_enabled: boolean;
  default_mode: ChatMode;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function ChatModesPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ChatModeSettings>({
    nsfw_enabled: true,  // Default: NSFW enabled (backwards compat)
    sfw_enabled: false,  // Default: SFW disabled
    default_mode: 'nsfw',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: API call to save chat mode settings
      await new Promise((r) => setTimeout(r, 1000));
      alert('Chat mode settings saved!');
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
      <div className="space-y-4 mb-8">
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
              onClick={() => setSettings((p) => ({ ...p, nsfw_enabled: !p.nsfw_enabled }))}
              className={`w-14 h-7 rounded-full transition-colors ${
                settings.nsfw_enabled ? 'bg-purple-500' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.nsfw_enabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.nsfw_enabled && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Configure your NSFW AI personality and pricing
                </p>
                <Link
                  href="/dashboard/ai-chat"
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
                >
                  Setup <ArrowRight className="w-4 h-4" />
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
              onClick={() => setSettings((p) => ({ ...p, sfw_enabled: !p.sfw_enabled }))}
              className={`w-14 h-7 rounded-full transition-colors ${
                settings.sfw_enabled ? 'bg-pink-500' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  settings.sfw_enabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.sfw_enabled && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Configure your Companion AI personality and pricing
                </p>
                <Link
                  href="/dashboard/companion-chat"
                  className="text-pink-400 hover:text-pink-300 flex items-center gap-1 text-sm"
                >
                  Setup <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Default Mode Selector (only if both enabled) */}
      {bothEnabled && (
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

      {/* Warning if none enabled */}
      {!settings.nsfw_enabled && !settings.sfw_enabled && (
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

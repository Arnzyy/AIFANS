'use client';

// ===========================================
// VOICE SETTINGS PANEL
// Creator panel to configure voice per personality
// ===========================================

import { useState, useEffect } from 'react';
import { VoiceLibraryPicker } from './VoiceLibraryPicker';
import type { ModelVoiceSettings, VoiceLibraryEntry } from '@/lib/voice/types';

interface VoiceSettingsPanelProps {
  personalityId: string;
  personalityName: string;
  onSave?: () => void;
}

export function VoiceSettingsPanel({
  personalityId,
  personalityName,
  onSave,
}: VoiceSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<Partial<ModelVoiceSettings>>({
    voice_id: null,
    stability: 0.5,
    similarity_boost: 0.75,
    style_exaggeration: 0.0,
    speed: 1.0,
    voice_enabled: false,
    realtime_enabled: false,
  });

  const [selectedVoice, setSelectedVoice] = useState<VoiceLibraryEntry | null>(null);

  // Fetch existing settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        const res = await fetch(`/api/creator/models/${personalityId}/voice`);
        if (!res.ok) throw new Error('Failed to fetch settings');

        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
        if (data.voice) {
          setSelectedVoice(data.voice);
        }
      } catch (err) {
        console.error('Error fetching voice settings:', err);
        setError('Failed to load voice settings');
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [personalityId]);

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/creator/models/${personalityId}/voice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess('Voice settings saved!');
      onSave?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving voice settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Update a setting
  const updateSetting = <K extends keyof ModelVoiceSettings>(
    key: K,
    value: ModelVoiceSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Handle voice selection
  const handleVoiceSelect = (voiceId: string) => {
    updateSetting('voice_id', voiceId);
    // We don't have the full voice object here, but it will be fetched on reload
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Voice Settings</h2>
        <p className="text-gray-400 mt-1">
          Configure the voice for {personalityName}
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
        <div>
          <h3 className="font-medium text-white">Enable Voice</h3>
          <p className="text-sm text-gray-400">
            Allow this AI to respond with voice messages
          </p>
        </div>
        <button
          onClick={() => updateSetting('voice_enabled', !settings.voice_enabled)}
          className={`
            relative w-14 h-8 rounded-full transition-colors
            ${settings.voice_enabled ? 'bg-purple-500' : 'bg-white/20'}
          `}
        >
          <span
            className={`
              absolute top-1 w-6 h-6 bg-white rounded-full transition-transform
              ${settings.voice_enabled ? 'left-7' : 'left-1'}
            `}
          />
        </button>
      </div>

      {/* Voice Selection */}
      <div className={settings.voice_enabled ? '' : 'opacity-50 pointer-events-none'}>
        <h3 className="font-medium text-white mb-4">Select Voice</h3>
        <VoiceLibraryPicker
          selectedVoiceId={settings.voice_id || null}
          onChange={handleVoiceSelect}
          disabled={!settings.voice_enabled}
        />
      </div>

      {/* Voice Parameters */}
      <div className={settings.voice_enabled ? 'space-y-6' : 'opacity-50 pointer-events-none space-y-6'}>
        <h3 className="font-medium text-white">Voice Parameters</h3>

        {/* Stability */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Stability</label>
            <span className="text-sm text-gray-400">{Math.round((settings.stability || 0.5) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={(settings.stability || 0.5) * 100}
            onChange={(e) => updateSetting('stability', parseInt(e.target.value) / 100)}
            disabled={!settings.voice_enabled}
            className="w-full accent-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Higher = more consistent, Lower = more expressive/varied
          </p>
        </div>

        {/* Similarity Boost */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Similarity Boost</label>
            <span className="text-sm text-gray-400">{Math.round((settings.similarity_boost || 0.75) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={(settings.similarity_boost || 0.75) * 100}
            onChange={(e) => updateSetting('similarity_boost', parseInt(e.target.value) / 100)}
            disabled={!settings.voice_enabled}
            className="w-full accent-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Higher = closer to original voice
          </p>
        </div>

        {/* Style Exaggeration */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Style</label>
            <span className="text-sm text-gray-400">{Math.round((settings.style_exaggeration || 0) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={(settings.style_exaggeration || 0) * 100}
            onChange={(e) => updateSetting('style_exaggeration', parseInt(e.target.value) / 100)}
            disabled={!settings.voice_enabled}
            className="w-full accent-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Amplifies the voice's unique characteristics
          </p>
        </div>

        {/* Speed */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Speed</label>
            <span className="text-sm text-gray-400">{settings.speed?.toFixed(1) || '1.0'}x</span>
          </div>
          <input
            type="range"
            min="50"
            max="200"
            value={(settings.speed || 1.0) * 100}
            onChange={(e) => updateSetting('speed', parseInt(e.target.value) / 100)}
            disabled={!settings.voice_enabled}
            className="w-full accent-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Speaking speed (0.5x to 2.0x)
          </p>
        </div>
      </div>

      {/* Realtime Voice Toggle */}
      <div className={`flex items-center justify-between p-4 bg-white/5 rounded-xl ${!settings.voice_enabled ? 'opacity-50' : ''}`}>
        <div>
          <h3 className="font-medium text-white">Enable Real-Time Voice Calls</h3>
          <p className="text-sm text-gray-400">
            Allow subscribers to have live voice conversations
          </p>
        </div>
        <button
          onClick={() => updateSetting('realtime_enabled', !settings.realtime_enabled)}
          disabled={!settings.voice_enabled}
          className={`
            relative w-14 h-8 rounded-full transition-colors
            ${settings.realtime_enabled && settings.voice_enabled ? 'bg-purple-500' : 'bg-white/20'}
          `}
        >
          <span
            className={`
              absolute top-1 w-6 h-6 bg-white rounded-full transition-transform
              ${settings.realtime_enabled && settings.voice_enabled ? 'left-7' : 'left-1'}
            `}
          />
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-white/10">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`
            px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl
            font-medium text-white transition-opacity
            ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
          `}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Voice Settings'
          )}
        </button>
      </div>
    </div>
  );
}

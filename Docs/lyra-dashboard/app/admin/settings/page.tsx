'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  DollarSign,
  Shield,
  Bell,
  Mail,
  Globe,
  Lock,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
  Database,
  Server,
  Zap,
} from 'lucide-react';

interface PlatformSettings {
  // Financial
  platformFeePercent: number;
  minPayoutAmount: number;
  payoutHoldDays: number;
  tokenExchangeRate: number; // tokens per £1
  
  // Limits
  maxModelsPerCreator: number;
  maxContentPerModel: number;
  maxGalleryImages: number;
  
  // Safety
  requireManualCreatorApproval: boolean;
  requireManualModelApproval: boolean;
  enableNsfwContent: boolean;
  minCreatorAge: number;
  minModelAge: number;
  
  // Features
  enableSubscriptions: boolean;
  enableTips: boolean;
  enablePpv: boolean;
  enableSfwChat: boolean;
  enableNsfwChat: boolean;
  
  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'financial' | 'safety' | 'features' | 'system'>('financial');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  // Default/mock settings
  const currentSettings: PlatformSettings = settings || {
    platformFeePercent: 20,
    minPayoutAmount: 1000,
    payoutHoldDays: 14,
    tokenExchangeRate: 250,
    maxModelsPerCreator: 5,
    maxContentPerModel: 1000,
    maxGalleryImages: 20,
    requireManualCreatorApproval: true,
    requireManualModelApproval: true,
    enableNsfwContent: true,
    minCreatorAge: 18,
    minModelAge: 18,
    enableSubscriptions: true,
    enableTips: true,
    enablePpv: true,
    enableSfwChat: true,
    enableNsfwChat: true,
    maintenanceMode: false,
    maintenanceMessage: '',
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSettings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof PlatformSettings, value: any) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-gray-400">Configure platform behavior and limits</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-zinc-900 rounded-lg p-1 w-fit">
        {[
          { id: 'financial', label: 'Financial', icon: DollarSign },
          { id: 'safety', label: 'Safety', icon: Shield },
          { id: 'features', label: 'Features', icon: Zap },
          { id: 'system', label: 'System', icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Financial Settings */}
      {activeTab === 'financial' && (
        <div className="bg-zinc-900 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold">Financial Settings</h2>

          <div className="grid grid-cols-2 gap-6">
            <SettingInput
              label="Platform Fee (%)"
              description="Percentage taken from creator earnings"
              type="number"
              value={currentSettings.platformFeePercent}
              onChange={(v) => updateSetting('platformFeePercent', parseFloat(v))}
              suffix="%"
            />
            <SettingInput
              label="Minimum Payout"
              description="Minimum balance required for payout (in pence)"
              type="number"
              value={currentSettings.minPayoutAmount}
              onChange={(v) => updateSetting('minPayoutAmount', parseInt(v))}
              suffix="pence"
            />
            <SettingInput
              label="Payout Hold Period"
              description="Days to hold earnings before they become available"
              type="number"
              value={currentSettings.payoutHoldDays}
              onChange={(v) => updateSetting('payoutHoldDays', parseInt(v))}
              suffix="days"
            />
            <SettingInput
              label="Token Exchange Rate"
              description="Number of tokens per £1"
              type="number"
              value={currentSettings.tokenExchangeRate}
              onChange={(v) => updateSetting('tokenExchangeRate', parseInt(v))}
              suffix="tokens/£"
            />
          </div>
        </div>
      )}

      {/* Safety Settings */}
      {activeTab === 'safety' && (
        <div className="bg-zinc-900 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold">Safety & Moderation</h2>

          <div className="space-y-4">
            <SettingToggle
              label="Manual Creator Approval"
              description="Require admin approval before creators can publish"
              checked={currentSettings.requireManualCreatorApproval}
              onChange={(v) => updateSetting('requireManualCreatorApproval', v)}
            />
            <SettingToggle
              label="Manual Model Approval"
              description="Require admin approval before models go live"
              checked={currentSettings.requireManualModelApproval}
              onChange={(v) => updateSetting('requireManualModelApproval', v)}
            />
            <SettingToggle
              label="Enable NSFW Content"
              description="Allow adult content on the platform"
              checked={currentSettings.enableNsfwContent}
              onChange={(v) => updateSetting('enableNsfwContent', v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
            <SettingInput
              label="Minimum Creator Age"
              description="Required age to become a creator"
              type="number"
              value={currentSettings.minCreatorAge}
              onChange={(v) => updateSetting('minCreatorAge', parseInt(v))}
              suffix="years"
            />
            <SettingInput
              label="Minimum Model Age"
              description="Minimum age for AI personas"
              type="number"
              value={currentSettings.minModelAge}
              onChange={(v) => updateSetting('minModelAge', parseInt(v))}
              suffix="years"
            />
          </div>

          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/10">
            <SettingInput
              label="Max Models/Creator"
              description="Maximum AI models per creator"
              type="number"
              value={currentSettings.maxModelsPerCreator}
              onChange={(v) => updateSetting('maxModelsPerCreator', parseInt(v))}
            />
            <SettingInput
              label="Max Content/Model"
              description="Maximum content items per model"
              type="number"
              value={currentSettings.maxContentPerModel}
              onChange={(v) => updateSetting('maxContentPerModel', parseInt(v))}
            />
            <SettingInput
              label="Max Gallery Images"
              description="Maximum gallery images per model"
              type="number"
              value={currentSettings.maxGalleryImages}
              onChange={(v) => updateSetting('maxGalleryImages', parseInt(v))}
            />
          </div>
        </div>
      )}

      {/* Feature Settings */}
      {activeTab === 'features' && (
        <div className="bg-zinc-900 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-bold">Feature Toggles</h2>

          <div className="space-y-4">
            <SettingToggle
              label="Subscriptions"
              description="Enable subscription-based monetization"
              checked={currentSettings.enableSubscriptions}
              onChange={(v) => updateSetting('enableSubscriptions', v)}
            />
            <SettingToggle
              label="Tips"
              description="Allow fans to send tips to creators"
              checked={currentSettings.enableTips}
              onChange={(v) => updateSetting('enableTips', v)}
            />
            <SettingToggle
              label="Pay-Per-View"
              description="Enable PPV content sales"
              checked={currentSettings.enablePpv}
              onChange={(v) => updateSetting('enablePpv', v)}
            />
            <SettingToggle
              label="SFW Chat (Companion Mode)"
              description="Enable safe-for-work AI chat"
              checked={currentSettings.enableSfwChat}
              onChange={(v) => updateSetting('enableSfwChat', v)}
            />
            <SettingToggle
              label="NSFW Chat (Intimate Mode)"
              description="Enable adult AI chat"
              checked={currentSettings.enableNsfwChat}
              onChange={(v) => updateSetting('enableNsfwChat', v)}
            />
          </div>
        </div>
      )}

      {/* System Settings */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Maintenance Mode */}
          <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">Maintenance Mode</h2>

            <SettingToggle
              label="Enable Maintenance Mode"
              description="Take the platform offline for maintenance"
              checked={currentSettings.maintenanceMode}
              onChange={(v) => updateSetting('maintenanceMode', v)}
              variant="danger"
            />

            {currentSettings.maintenanceMode && (
              <div>
                <label className="block text-sm font-medium mb-2">Maintenance Message</label>
                <textarea
                  value={currentSettings.maintenanceMessage}
                  onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                  placeholder="We're performing scheduled maintenance. Please check back soon."
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg resize-none focus:outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>

          {/* System Actions */}
          <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">System Actions</h2>

            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left">
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">Clear Cache</span>
                </div>
                <p className="text-sm text-gray-500">Clear all cached data</p>
              </button>

              <button className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="w-5 h-5 text-green-400" />
                  <span className="font-medium">Reindex Search</span>
                </div>
                <p className="text-sm text-gray-500">Rebuild search indexes</p>
              </button>

              <button className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="w-5 h-5 text-purple-400" />
                  <span className="font-medium">Test Email</span>
                </div>
                <p className="text-sm text-gray-500">Send test email</p>
              </button>

              <button className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left">
                <div className="flex items-center gap-3 mb-2">
                  <Server className="w-5 h-5 text-yellow-400" />
                  <span className="font-medium">Health Check</span>
                </div>
                <p className="text-sm text-gray-500">Run system diagnostics</p>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              These actions are destructive and cannot be undone. Use with extreme caution.
            </p>
            <div className="flex gap-4">
              <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm">
                Purge Deleted Content
              </button>
              <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm">
                Reset Rate Limits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingInput({
  label,
  description,
  type,
  value,
  onChange,
  suffix,
}: {
  label: string;
  description: string;
  type: string;
  value: number;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <p className="text-xs text-gray-500 mb-2">{description}</p>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
        />
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
  variant = 'default',
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <div>
        <p className={`font-medium ${variant === 'danger' ? 'text-red-400' : ''}`}>{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition relative ${
          checked
            ? variant === 'danger'
              ? 'bg-red-500'
              : 'bg-purple-500'
            : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

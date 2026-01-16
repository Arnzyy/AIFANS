'use client';

import { useState } from 'react';
import {
  Settings,
  Shield,
  DollarSign,
  Bell,
  Globe,
  Save,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import FeatureFlagsSettings from '@/components/admin/FeatureFlagsSettings';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    // Platform settings
    maintenanceMode: false,
    registrationOpen: true,

    // Moderation
    autoApproveModels: false,
    requireIdVerification: true,
    nsfwDefaultEnabled: false,

    // Payments
    platformFeePercent: 20,
    minWithdrawal: 5000, // in cents
    payoutDelay: 7, // days

    // Notifications
    emailNotifications: true,
    slackAlerts: false,
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement actual settings save to database
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button onClick={onChange} className="text-purple-400">
      {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-zinc-500" />}
    </button>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-zinc-400 mt-1">Configure platform settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Platform Settings */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-6">
          <Globe size={18} className="text-zinc-400" />
          Platform Settings
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-zinc-500">Temporarily disable the platform for maintenance</p>
            </div>
            <Toggle
              enabled={settings.maintenanceMode}
              onChange={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Open Registration</p>
              <p className="text-sm text-zinc-500">Allow new users to register</p>
            </div>
            <Toggle
              enabled={settings.registrationOpen}
              onChange={() => setSettings({ ...settings, registrationOpen: !settings.registrationOpen })}
            />
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <FeatureFlagsSettings />

      {/* Moderation Settings */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-6">
          <Shield size={18} className="text-zinc-400" />
          Moderation
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div>
              <p className="font-medium">Auto-Approve Models</p>
              <p className="text-sm text-zinc-500">Automatically approve new model submissions</p>
            </div>
            <Toggle
              enabled={settings.autoApproveModels}
              onChange={() => setSettings({ ...settings, autoApproveModels: !settings.autoApproveModels })}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div>
              <p className="font-medium">Require ID Verification</p>
              <p className="text-sm text-zinc-500">Require creators to verify their identity</p>
            </div>
            <Toggle
              enabled={settings.requireIdVerification}
              onChange={() => setSettings({ ...settings, requireIdVerification: !settings.requireIdVerification })}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">NSFW Default Enabled</p>
              <p className="text-sm text-zinc-500">Enable NSFW content by default for new models</p>
            </div>
            <Toggle
              enabled={settings.nsfwDefaultEnabled}
              onChange={() => setSettings({ ...settings, nsfwDefaultEnabled: !settings.nsfwDefaultEnabled })}
            />
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-6">
          <DollarSign size={18} className="text-zinc-400" />
          Payments
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div>
              <p className="font-medium">Platform Fee (%)</p>
              <p className="text-sm text-zinc-500">Percentage taken from creator earnings</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.platformFeePercent}
                onChange={(e) => setSettings({ ...settings, platformFeePercent: parseInt(e.target.value) || 0 })}
                className="w-20 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 outline-none text-right"
                min="0"
                max="100"
              />
              <span className="text-zinc-500">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div>
              <p className="font-medium">Minimum Withdrawal</p>
              <p className="text-sm text-zinc-500">Minimum amount required for payout</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">£</span>
              <input
                type="number"
                value={(settings.minWithdrawal / 100).toFixed(2)}
                onChange={(e) => setSettings({ ...settings, minWithdrawal: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                className="w-24 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 outline-none text-right"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Payout Delay</p>
              <p className="text-sm text-zinc-500">Days to wait before processing payouts</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.payoutDelay}
                onChange={(e) => setSettings({ ...settings, payoutDelay: parseInt(e.target.value) || 0 })}
                className="w-20 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 outline-none text-right"
                min="0"
              />
              <span className="text-zinc-500">days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-6">
          <Bell size={18} className="text-zinc-400" />
          Notifications
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-zinc-500">Send email alerts for important events</p>
            </div>
            <Toggle
              enabled={settings.emailNotifications}
              onChange={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Slack Alerts</p>
              <p className="text-sm text-zinc-500">Send alerts to Slack channel</p>
            </div>
            <Toggle
              enabled={settings.slackAlerts}
              onChange={() => setSettings({ ...settings, slackAlerts: !settings.slackAlerts })}
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <h2 className="font-semibold text-red-400 mb-4">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Clear All Cache</p>
              <p className="text-sm text-zinc-500">Clear all cached data from the platform</p>
            </div>
            <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

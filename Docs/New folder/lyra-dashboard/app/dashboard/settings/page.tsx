'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Save, Camera, Plus, Info, Trash2 } from 'lucide-react';

type Tab = 'profile' | 'tiers' | 'payout';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as Tab) || 'profile';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [saving, setSaving] = useState(false);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your profile and subscriptions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['profile', 'tiers', 'payout'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
              activeTab === tab
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-900 text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'tiers' && <TiersTab />}
      {activeTab === 'payout' && <PayoutTab />}
    </div>
  );
}

// ===========================================
// PROFILE TAB
// ===========================================

function ProfileTab() {
  const [profile, setProfile] = useState({
    username: 'u543889685',
    display_name: 'Billy Arnold',
    bio: '',
    location: '',
  });

  return (
    <div className="space-y-6">
      {/* Avatar & Cover */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-blue-500/30 to-purple-500/30 relative">
          <button className="absolute top-4 right-4 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        {/* Avatar */}
        <div className="px-6 pb-6">
          <div className="relative -mt-12 mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold border-4 border-zinc-900">
              BA
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition">
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Username</label>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">@</span>
            <input
              type="text"
              value={profile.username}
              onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
              className="flex-1 px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">https://joinlyra.com/@{profile.username}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Display Name</label>
          <input
            type="text"
            value={profile.display_name}
            onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
            className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">{profile.display_name.length}/40</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Bio</label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            placeholder="Tell fans about yourself..."
            rows={4}
            className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">{profile.bio.length}/1000</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <input
            type="text"
            value={profile.location}
            onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
            placeholder="City, Country"
            className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>

        <button className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ===========================================
// TIERS TAB
// ===========================================

function TiersTab() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [newTier, setNewTier] = useState({
    name: '',
    price: 9.99,
    description: '',
    duration: '1_month',
  });

  const addTier = () => {
    if (newTier.name && newTier.price) {
      setTiers([...tiers, { ...newTier, id: Date.now() }]);
      setNewTier({ name: '', price: 9.99, description: '', duration: '1_month' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Tiers */}
      {tiers.length > 0 && (
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div key={tier.id} className="bg-zinc-900 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{tier.name}</p>
                <p className="text-sm text-gray-400">£{tier.price}/month</p>
              </div>
              <button
                onClick={() => setTiers(tiers.filter((t) => t.id !== tier.id))}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Tier Form */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h3 className="font-bold mb-4">Create New Tier</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={newTier.name}
                onChange={(e) => setNewTier((p) => ({ ...p, name: e.target.value }))}
                placeholder="Basic, Premium, VIP..."
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Price (£)</label>
              <input
                type="number"
                min={0.99}
                step={0.50}
                value={newTier.price}
                onChange={(e) => setNewTier((p) => ({ ...p, price: parseFloat(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <input
              type="text"
              value={newTier.description}
              onChange={(e) => setNewTier((p) => ({ ...p, description: e.target.value }))}
              placeholder="What's included..."
              className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <select
              value={newTier.duration}
              onChange={(e) => setNewTier((p) => ({ ...p, duration: e.target.value }))}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            >
              <option value="1_month">1 Month</option>
              <option value="3_months">3 Months</option>
              <option value="6_months">6 Months</option>
              <option value="12_months">12 Months</option>
            </select>
          </div>

          <button
            onClick={addTier}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Create Tier
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// PAYOUT TAB
// ===========================================

function PayoutTab() {
  return (
    <div className="space-y-6">
      {/* Coming Soon */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <p className="font-medium text-yellow-300">Coming Soon</p>
        <p className="text-sm text-yellow-200/80 mt-1">
          Payout settings will be available once payment processing is integrated.
          In development mode, all transactions are simulated.
        </p>
      </div>

      {/* How Payouts Work */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h3 className="font-bold mb-4">How Payouts Work</h3>
        <ul className="space-y-3 text-gray-300">
          <li className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
            <span>You keep 80% of all earnings (subscriptions, tips, PPV, AI chat)</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
            <span>Platform fee is 20%</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
            <span>Minimum payout: £50</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
            <span>Payout schedule: Weekly or Monthly</span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
            <span>Payment methods: Bank transfer, PayPal</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

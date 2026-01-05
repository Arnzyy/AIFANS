'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Tier {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  benefits: string[];
  is_featured: boolean;
  is_active: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'tiers' | 'payout'>('profile');
  
  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  
  // Tiers state
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [newTier, setNewTier] = useState({
    name: '',
    description: '',
    price: '',
    duration_months: 1,
  });

  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, creator_profiles(*)')
      .eq('id', user.id)
      .single();

    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || '');
      if (profile.creator_profiles) {
        setBio(profile.creator_profiles.bio || '');
        setBannerUrl(profile.creator_profiles.banner_url || '');
      }
    }

    // Load tiers
    const { data: tiersData } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('creator_id', user.id)
      .eq('is_active', true)
      .order('price', { ascending: true });

    setTiers(tiersData || []);
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          avatar_url: avatarUrl,
          bio,
          banner_url: bannerUrl,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile saved!' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save profile' });
    }

    setSaving(false);
  };

  const createTier = async () => {
    if (!newTier.name || !newTier.price) {
      setMessage({ type: 'error', text: 'Name and price required' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTier.name,
          description: newTier.description,
          price: Math.round(parseFloat(newTier.price) * 100),
          duration_months: newTier.duration_months,
        }),
      });

      if (res.ok) {
        const { tier } = await res.json();
        setTiers(prev => [...prev, tier]);
        setNewTier({ name: '', description: '', price: '', duration_months: 1 });
        setMessage({ type: 'success', text: 'Tier created!' });
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create tier' });
    }

    setSaving(false);
  };

  const deleteTier = async (tierId: string) => {
    if (!confirm('Delete this tier?')) return;

    try {
      await fetch(`/api/tiers?id=${tierId}`, { method: 'DELETE' });
      setTiers(prev => prev.filter(t => t.id !== tierId));
      setMessage({ type: 'success', text: 'Tier deleted' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete tier' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your profile and subscriptions</p>
      </div>

      {message.text && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {(['profile', 'tiers', 'payout'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Avatar URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Banner URL</label>
            <input
              type="url"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )}

      {/* Tiers Tab */}
      {activeTab === 'tiers' && (
        <div className="space-y-6">
          {/* Existing tiers */}
          {tiers.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Your Tiers</h3>
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div>
                    <p className="font-medium">{tier.name}</p>
                    <p className="text-sm text-gray-500">
                      £{(tier.price / 100).toFixed(2)} / {tier.duration_months} month{tier.duration_months > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTier(tier.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create new tier */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <h3 className="font-medium">Create New Tier</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newTier.name}
                  onChange={(e) => setNewTier(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Basic, Premium, VIP..."
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price (£)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={newTier.price}
                  onChange={(e) => setNewTier(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="9.99"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={newTier.description}
                onChange={(e) => setNewTier(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What's included..."
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <select
                value={newTier.duration_months}
                onChange={(e) => setNewTier(prev => ({ ...prev, duration_months: parseInt(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
              >
                <option value={1}>1 Month</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
              </select>
            </div>

            <button
              onClick={createTier}
              disabled={saving || tiers.length >= 5}
              className="px-6 py-2 bg-purple-500 rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Tier'}
            </button>
            
            {tiers.length >= 5 && (
              <p className="text-sm text-yellow-400">Maximum 5 tiers reached</p>
            )}
          </div>
        </div>
      )}

      {/* Payout Tab */}
      {activeTab === 'payout' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <h3 className="font-medium text-yellow-400 mb-2">🚧 Coming Soon</h3>
            <p className="text-sm text-gray-400">
              Payout settings will be available once payment processing is integrated.
              In development mode, all transactions are simulated.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="font-medium mb-3">How Payouts Work</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• You keep 80% of all earnings (subscriptions, tips, PPV, AI chat)</li>
              <li>• Platform fee is 20%</li>
              <li>• Minimum payout: £50</li>
              <li>• Payout schedule: Weekly or Monthly</li>
              <li>• Payment methods: Bank transfer, PayPal</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

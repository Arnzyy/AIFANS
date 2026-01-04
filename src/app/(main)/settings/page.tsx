'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile settings
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Privacy settings
  const [profilePublic, setProfilePublic] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/settings');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || '');
        setUsername(profile.username || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatar_url || '');
        setEmailNotifications(profile.email_notifications ?? true);
        setPushNotifications(profile.push_notifications ?? true);
        setMarketingEmails(profile.marketing_emails ?? false);
        setProfilePublic(profile.profile_public ?? true);
        setShowOnlineStatus(profile.show_online_status ?? true);
      }

    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let finalAvatarUrl = avatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        const fileName = `${user.id}/${Date.now()}-avatar.${avatarFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          bio: bio || null,
          avatar_url: finalAvatarUrl || null,
          email_notifications: emailNotifications,
          push_notifications: pushNotifications,
          marketing_emails: marketingEmails,
          profile_public: profilePublic,
          show_online_status: showOnlineStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess('Settings saved successfully!');
      setAvatarFile(null);

    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          {success}
        </div>
      )}

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-20 h-20 rounded-full bg-white/10 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">
                  {displayName?.charAt(0) || username?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                Change Avatar
              </button>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max 5MB.</p>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
                placeholder="Your display name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                disabled
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors resize-none"
                placeholder="Tell others about yourself..."
              />
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive updates via email</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-purple-500' : 'bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${emailNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-gray-500">Receive push notifications</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  onChange={(e) => setPushNotifications(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${pushNotifications ? 'bg-purple-500' : 'bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${pushNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-sm text-gray-500">Receive promotional content</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={marketingEmails}
                  onChange={(e) => setMarketingEmails(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${marketingEmails ? 'bg-purple-500' : 'bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${marketingEmails ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="p-6 rounded-xl bg-white/5 border border-white/10">
          <h2 className="text-lg font-semibold mb-4">Privacy</h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Public Profile</p>
                <p className="text-sm text-gray-500">Allow others to view your profile</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={profilePublic}
                  onChange={(e) => setProfilePublic(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${profilePublic ? 'bg-purple-500' : 'bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${profilePublic ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Show Online Status</p>
                <p className="text-sm text-gray-500">Let others see when you&apos;re online</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showOnlineStatus}
                  onChange={(e) => setShowOnlineStatus(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${showOnlineStatus ? 'bg-purple-500' : 'bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${showOnlineStatus ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Danger Zone */}
        <section className="p-6 rounded-xl bg-red-500/10 border border-red-500/20">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Account Actions</h2>

          <div className="space-y-4">
            <button
              onClick={handleSignOut}
              className="w-full py-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
            >
              Sign Out
            </button>

            <button
              className="w-full py-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

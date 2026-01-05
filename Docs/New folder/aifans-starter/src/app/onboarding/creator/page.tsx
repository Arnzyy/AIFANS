'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { CREATOR_DECLARATIONS } from '@/lib/compliance/constants';

type Step = 'welcome' | 'declarations' | 'profile' | 'complete';

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Declarations state
  const [declarations, setDeclarations] = useState<Record<string, boolean>>(
    Object.fromEntries(CREATOR_DECLARATIONS.map(d => [d.id, false]))
  );
  
  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  const allDeclarationsChecked = CREATOR_DECLARATIONS.every(d => declarations[d.id]);

  const handleDeclarationChange = (id: string, checked: boolean) => {
    setDeclarations(prev => ({ ...prev, [id]: checked }));
  };

  const submitDeclarations = async () => {
    if (!allDeclarationsChecked) {
      setError('You must agree to all declarations to continue');
      return;
    }

    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    // Store declarations (immutable audit log)
    const { error: insertError } = await supabase
      .from('creator_declarations')
      .insert({
        user_id: user.id,
        ...declarations,
        ip_address: null, // Would get from API route in production
        user_agent: navigator.userAgent,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('profile');
  };

  const submitProfile = async () => {
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        display_name: displayName,
        role: 'creator',
      })
      .eq('id', user.id);

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // Create creator profile
    const { error: creatorError } = await supabase
      .from('creator_profiles')
      .insert({
        user_id: user.id,
        bio,
      });

    if (creatorError) {
      setError(creatorError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('complete');
  };

  // Welcome step
  if (step === 'welcome') {
    return (
      <OnboardingLayout>
        <div className="text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold">Welcome, Creator!</h1>
          <p className="text-gray-400 max-w-md mx-auto">
            Before you start publishing content, we need to go through a few important steps 
            to ensure you understand our platform policies.
          </p>
          <button
            onClick={() => setStep('declarations')}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  // Declarations step (REQUIRED)
  if (step === 'declarations') {
    return (
      <OnboardingLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Creator Agreement</h1>
            <p className="text-gray-400 mt-2">
              Please read and confirm each statement below. These declarations are legally binding 
              and will be stored for compliance purposes.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {CREATOR_DECLARATIONS.map((declaration) => (
              <label
                key={declaration.id}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  declarations[declaration.id]
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={declarations[declaration.id]}
                  onChange={(e) => handleDeclarationChange(declaration.id, e.target.checked)}
                  className="mt-1 rounded bg-white/5 border-white/10 text-purple-500 focus:ring-purple-500"
                />
                <div>
                  <p className="font-medium">{declaration.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{declaration.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-200">
              ⚠️ <strong>Important:</strong> These declarations are timestamped and stored permanently. 
              Violation of these terms may result in immediate account termination and potential legal action.
            </p>
          </div>

          <button
            onClick={submitDeclarations}
            disabled={!allDeclarationsChecked || loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'I Agree to All Terms'}
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  // Profile setup step
  if (step === 'profile') {
    return (
      <OnboardingLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Set Up Your Profile</h1>
            <p className="text-gray-400 mt-2">
              Tell your fans a bit about yourself and your content.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                placeholder="Your creator name"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors resize-none"
                placeholder="Tell fans about yourself and your content..."
              />
            </div>
          </div>

          <p className="text-sm text-gray-500">
            You can add more details, profile picture, and banner later in settings.
          </p>

          <button
            onClick={submitProfile}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  // Complete step
  return (
    <OnboardingLayout>
      <div className="text-center space-y-6">
        <div className="text-6xl">✅</div>
        <h1 className="text-3xl font-bold">You're All Set!</h1>
        <p className="text-gray-400 max-w-md mx-auto">
          Your creator account is ready. Start by setting up your subscription tiers 
          and posting your first content.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => router.push('/posts/new')}
            className="px-8 py-3 border border-white/20 rounded-lg font-medium hover:bg-white/5 transition-colors"
          >
            Create First Post
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {children}
      </div>
    </div>
  );
}

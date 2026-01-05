'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { AGE_VERIFICATION_TEXT } from '@/lib/compliance/constants';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreator = searchParams.get('creator') === 'true';
  
  const [step, setStep] = useState<'age' | 'details'>('age');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAgeConfirm = () => {
    if (!ageConfirmed) {
      setError('You must confirm your age to continue');
      return;
    }
    setError('');
    setStep('details');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setError('Username must be 3-20 characters, letters, numbers, and underscores only');
      setLoading(false);
      return;
    }

    // Check if username is taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (existingUser) {
      setError('Username is already taken');
      setLoading(false);
      return;
    }

    // Create account
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase(),
          role: isCreator ? 'creator' : 'fan',
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Redirect based on account type
    if (isCreator) {
      router.push('/onboarding/creator');
    } else {
      router.push('/explore');
    }
    router.refresh();
  };

  // Age verification gate
  if (step === 'age') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🔞</div>
          <h1 className="text-2xl font-bold">Age Verification</h1>
          <p className="text-gray-400 mt-2">{AGE_VERIFICATION_TEXT.gate}</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <label className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            className="mt-1 rounded bg-white/5 border-white/10 text-purple-500 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-300">
            {AGE_VERIFICATION_TEXT.confirm}
          </span>
        </label>

        <button
          onClick={handleAgeConfirm}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Continue
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Registration form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">
          {isCreator ? 'Become a Creator' : 'Create Account'}
        </h1>
        <p className="text-gray-400 mt-2">
          {isCreator 
            ? 'Start monetizing your AI content' 
            : 'Join the community'}
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-2">
            Username
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              className="w-full pl-8 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
              placeholder="username"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This will be your unique profile URL
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
            placeholder="••••••••"
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum 8 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-gray-400">
        Already have an account?{' '}
        <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
          Sign in
        </Link>
      </p>

      {!isCreator && (
        <p className="text-center text-sm text-gray-500">
          Want to monetize content?{' '}
          <Link href="/register?creator=true" className="text-purple-400 hover:text-purple-300">
            Sign up as creator
          </Link>
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

'use client';

import { useState, useEffect } from 'react';

export function AgeGate({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lyra_age_verified');
    setVerified(stored === 'true');
  }, []);

  const handleVerify = () => {
    localStorage.setItem('lyra_age_verified', 'true');
    setVerified(true);
  };

  const handleReject = () => {
    window.location.href = 'https://google.com';
  };

  if (verified === null) {
    return <div className="min-h-screen bg-black" />;
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 text-center">
        <div className="mb-6">
          <img
            src="/logo.png"
            alt="LYRA"
            className="h-16 mx-auto mb-2"
          />
          <p className="text-gray-500 mt-2">Premium AI Creators</p>
        </div>

        <div className="mb-8">
          <div className="text-5xl mb-4">🔞</div>
          <h2 className="text-xl font-semibold mb-2">Adult Content</h2>
          <p className="text-gray-400">
            This website contains adult-themed content including lingerie imagery
            and suggestive AI chat. You must be 18 years or older to enter.
          </p>
        </div>

        <p className="text-xs text-gray-500 mb-6">
          By entering, you confirm you are at least 18 years old and agree to our
          Terms of Service. All creators on LYRA are fictional AI-generated personas.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleVerify}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            I am 18 or older — Enter
          </button>
          <button
            onClick={handleReject}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-full font-medium hover:bg-white/10 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

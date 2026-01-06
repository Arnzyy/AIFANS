'use client';

import { useState, useEffect } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';

export default function VerifyCreatorPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/dev/verify-creator');
      const data = await res.json();
      setStatus(data);
    } catch (error: any) {
      setMessage('Error: ' + error.message);
    }
  };

  const verifyCreator = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/dev/verify-creator', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setMessage('✅ Success! Creator account verified. Refresh the page to see changes.');
        await checkStatus();
      } else {
        setMessage('❌ Error: ' + data.error);
      }
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-zinc-900 rounded-xl p-8 border border-white/10">
        <h1 className="text-3xl font-bold mb-6">Creator Verification Tool</h1>

        {/* Current Status */}
        {status && (
          <div className="mb-6 p-4 bg-zinc-800 rounded-lg space-y-2">
            <h2 className="text-xl font-semibold mb-3">Current Status</h2>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-gray-400">User ID:</span>{' '}
                <code className="text-purple-400">{status.userId}</code>
              </p>
              <p>
                <span className="text-gray-400">Email:</span>{' '}
                <span className="text-white">{status.email}</span>
              </p>
              <p>
                <span className="text-gray-400">Creator Profile:</span>{' '}
                {status.creatorProfile ? (
                  <span className="text-green-400">✓ Exists</span>
                ) : (
                  <span className="text-yellow-400">✗ Not created</span>
                )}
              </p>
              <p>
                <span className="text-gray-400">Verified:</span>{' '}
                {status.isVerified ? (
                  <span className="text-green-400 font-bold">✓ YES</span>
                ) : (
                  <span className="text-red-400 font-bold">✗ NO</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={verifyCreator}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Verify My Creator Account
              </>
            )}
          </button>

          <button
            onClick={checkStatus}
            className="px-6 py-3 bg-zinc-800 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-zinc-700 transition"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h3 className="font-semibold mb-2">Instructions</h3>
          <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
            <li>Click "Verify My Creator Account" to set your account as verified</li>
            <li>After verification, go to /browse to see the mode switcher</li>
            <li>You should now see "Creator" and "Fan Mode" toggle in the sidebar</li>
            <li>Click "Creator" to access your creator dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

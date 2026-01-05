'use client';

import { useState } from 'react';

interface Creator {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface TipModalProps {
  creator: Creator;
  onClose: () => void;
  onSuccess?: () => void;
}

const quickAmounts = [200, 500, 1000, 2000, 5000]; // in pence

export function TipModal({ creator, onClose, onSuccess }: TipModalProps) {
  const [amount, setAmount] = useState('5.00');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTip = async () => {
    const amountPence = Math.round(parseFloat(amount) * 100);
    
    if (isNaN(amountPence) || amountPence < 100) {
      setError('Minimum tip is £1');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: creator.id,
          amount: amountPence,
          message: message || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send tip');
      }

      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-zinc-900 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Send a Tip</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
            )}
          </div>
          <div>
            <p className="font-medium">{creator.display_name || creator.username}</p>
            <p className="text-sm text-gray-500">@{creator.username}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Quick amounts */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => setAmount((amt / 100).toFixed(2))}
              className={`px-4 py-2 rounded-lg transition-colors ${
                parseFloat(amount) * 100 === amt
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              £{(amt / 100).toFixed(0)}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Amount (£)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
          />
        </div>

        {/* Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Message (optional)</label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something nice..."
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
          />
        </div>

        {/* Dev notice */}
        <div className="mb-4 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-xs text-yellow-400 text-center">
            🚧 DEV MODE: No real payment
          </p>
        </div>

        {/* Send button */}
        <button
          onClick={handleTip}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Sending...' : `Send £${parseFloat(amount || '0').toFixed(2)} Tip`}
        </button>
      </div>
    </div>
  );
}

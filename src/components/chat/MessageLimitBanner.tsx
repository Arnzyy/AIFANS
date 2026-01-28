// =====================================================
// MESSAGE LIMIT BANNER
// Shows when user has ≤20 messages remaining
// Only visible to subscribers with message limits
// =====================================================

'use client';

import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface MessageLimitBannerProps {
  messagesRemaining: number;
  onBuyMore: () => void;
}

export function MessageLimitBanner({ messagesRemaining, onBuyMore }: MessageLimitBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show if dismissed or if more than 20 messages
  if (dismissed || messagesRemaining > 20) {
    return null;
  }

  // Determine urgency level
  const isUrgent = messagesRemaining <= 5;
  const isWarning = messagesRemaining <= 10;

  return (
    <div
      className={`relative border-b ${
        isUrgent
          ? 'bg-red-500/20 border-red-500/30'
          : isWarning
          ? 'bg-yellow-500/20 border-yellow-500/30'
          : 'bg-purple-500/20 border-purple-500/30'
      } px-4 py-3`}
    >
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        {/* Icon */}
        <AlertCircle
          className={`w-5 h-5 flex-shrink-0 ${
            isUrgent
              ? 'text-red-400'
              : isWarning
              ? 'text-yellow-400'
              : 'text-purple-400'
          }`}
        />

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">
            {isUrgent ? (
              <span>
                <strong>{messagesRemaining}</strong> messages left this month
              </span>
            ) : (
              <span>
                <strong>{messagesRemaining}</strong> messages remaining
              </span>
            )}
          </p>
          <p className="text-xs text-gray-300 mt-0.5">
            {isUrgent
              ? 'Running low! Buy more with tokens to keep chatting'
              : 'Get more messages with tokens'}
          </p>
        </div>

        {/* Buy Button */}
        <button
          onClick={onBuyMore}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition flex-shrink-0 ${
            isUrgent
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : isWarning
              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
        >
          Buy More
        </button>

        {/* Dismiss (only if not urgent) */}
        {!isUrgent && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-white/10 transition flex-shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Lock, Coins, Heart, AlertTriangle, LogIn, Sparkles } from 'lucide-react';
import type { ChatAccess, UnlockOption } from '@/lib/chat';

// ===========================================
// TYPES
// ===========================================

interface ChatAccessGateProps {
  access: ChatAccess;
  onSubscribe: () => void;
  onPurchaseSession: (option: UnlockOption) => void;
  onExtendMessages: (option: UnlockOption) => void;
  tokenBalance?: number;
  isLoading?: boolean;
  children: React.ReactNode; // The chat input
  creatorUsername?: string; // For login redirect
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function ChatAccessGate({
  access,
  onSubscribe,
  onPurchaseSession,
  onExtendMessages,
  tokenBalance = 0,
  isLoading = false,
  children,
  creatorUsername,
}: ChatAccessGateProps) {
  const [showOptions, setShowOptions] = useState(false);
  const pathname = usePathname();

  // If user can send messages, just render the input
  if (access.canSendMessage) {
    return (
      <div className="space-y-2">
        {/* Message warning when low */}
        {access.isLowMessages && access.warningMessage && (
          <MessageWarning
            remaining={access.messagesRemaining}
            warning={access.warningMessage}
            onExtend={() => setShowOptions(true)}
          />
        )}
        {children}
      </div>
    );
  }

  // User cannot send - show locked state with unlock options
  const isGuest = access.accessType === 'guest';

  return (
    <div className="space-y-4">
      {/* Locked input state */}
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
      </div>

      {/* Unlock CTA */}
      <UnlockPrompt
        access={access}
        tokenBalance={tokenBalance}
        onSubscribe={onSubscribe}
        onPurchaseSession={onPurchaseSession}
        onExtendMessages={onExtendMessages}
        isLoading={isLoading}
        loginRedirect={pathname || `/chat/${creatorUsername}`}
        isGuest={isGuest}
      />
    </div>
  );
}

// ===========================================
// MESSAGE WARNING
// ===========================================

function MessageWarning({
  remaining,
  warning,
  onExtend,
}: {
  remaining: number | null;
  warning: string;
  onExtend: () => void;
}) {
  if (remaining === null) return null;

  const isLastMessage = remaining === 1;
  const isUrgent = remaining <= 1;

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 rounded-lg ${
        isUrgent
          ? 'bg-orange-500/20 border border-orange-500/30'
          : 'bg-yellow-500/10 border border-yellow-500/20'
      }`}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className={`w-4 h-4 ${isUrgent ? 'text-orange-400' : 'text-yellow-400'}`} />
        <span className={`text-sm ${isUrgent ? 'text-orange-300' : 'text-yellow-300'}`}>
          {warning}
        </span>
      </div>
      <button
        onClick={onExtend}
        className="text-sm font-medium text-purple-400 hover:text-purple-300 transition"
      >
        Get more
      </button>
    </div>
  );
}

// ===========================================
// UNLOCK PROMPT
// ===========================================

function UnlockPrompt({
  access,
  tokenBalance,
  onSubscribe,
  onPurchaseSession,
  onExtendMessages,
  isLoading,
  loginRedirect,
  isGuest,
}: {
  access: ChatAccess;
  tokenBalance: number;
  onSubscribe: () => void;
  onPurchaseSession: (option: UnlockOption) => void;
  onExtendMessages: (option: UnlockOption) => void;
  isLoading: boolean;
  loginRedirect: string;
  isGuest: boolean;
}) {
  const { unlockOptions, accessType } = access;

  // Different messaging based on state
  const isSubscriber = accessType === 'subscription';
  const hadSession = accessType === 'paid_session';

  return (
    <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="text-center">
        {isGuest ? (
          <>
            <div className="flex justify-center mb-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="font-semibold text-white">Ready to chat?</h3>
            <p className="text-sm text-gray-400 mt-1">
              Log in to start chatting or subscribe for full access
            </p>
          </>
        ) : isSubscriber ? (
          <>
            <h3 className="font-semibold text-white">Monthly messages used</h3>
            <p className="text-sm text-gray-400 mt-1">
              Purchase additional messages to continue chatting
            </p>
          </>
        ) : hadSession ? (
          <>
            <h3 className="font-semibold text-white">Session complete</h3>
            <p className="text-sm text-gray-400 mt-1">
              Buy more messages or subscribe for unlimited access
            </p>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-white">Unlock chat access</h3>
            <p className="text-sm text-gray-400 mt-1">
              Subscribe or purchase messages to start chatting
            </p>
          </>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {unlockOptions.map((option, idx) => (
          <UnlockOptionButton
            key={`${option.type}-${idx}`}
            option={option}
            tokenBalance={tokenBalance}
            onSelect={() => {
              if (option.type === 'subscribe') {
                onSubscribe();
              } else if (option.type === 'paid_session') {
                onPurchaseSession(option);
              } else if (option.type === 'extend_messages') {
                onExtendMessages(option);
              }
              // Login is handled by the button itself via Link
            }}
            isLoading={isLoading}
            loginRedirect={loginRedirect}
            isGuest={isGuest}
          />
        ))}
      </div>

      {/* Token balance reminder - only show for logged in users */}
      {!isGuest && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Coins className="w-4 h-4" />
          <span>Your balance: {tokenBalance.toLocaleString()} tokens</span>
        </div>
      )}

      {/* Sign up CTA for guests */}
      {isGuest && (
        <div className="text-center text-sm text-gray-500">
          <span>Don&apos;t have an account? </span>
          <Link
            href={`/signup?redirect=${encodeURIComponent(loginRedirect)}`}
            className="text-purple-400 hover:text-purple-300 font-medium"
          >
            Sign up free
          </Link>
        </div>
      )}
    </div>
  );
}

// ===========================================
// UNLOCK OPTION BUTTON
// ===========================================

function UnlockOptionButton({
  option,
  tokenBalance,
  onSelect,
  isLoading,
  loginRedirect,
  isGuest,
}: {
  option: UnlockOption;
  tokenBalance: number;
  onSelect: () => void;
  isLoading: boolean;
  loginRedirect: string;
  isGuest: boolean;
}) {
  const canAfford = !option.cost || tokenBalance >= option.cost;

  // Login button - special handling
  if (option.type === 'login') {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(loginRedirect)}`}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${
          option.recommended
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        <LogIn className="w-4 h-4" />
        {option.label}
      </Link>
    );
  }

  // Subscribe button - always show modal first (modal handles guest redirect)
  if (option.type === 'subscribe') {
    return (
      <button
        onClick={onSelect}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${
          option.recommended
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
            : 'bg-white/10 text-white hover:bg-white/20'
        } disabled:opacity-50`}
      >
        <Heart className="w-4 h-4" />
        {option.label}
        {option.recommended && (
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Recommended</span>
        )}
      </button>
    );
  }

  // Paid session / extend - for guests, show price but require login
  if (isGuest) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(loginRedirect)}`}
        className="w-full flex items-center justify-between py-3 px-4 rounded-lg transition bg-white/10 text-white hover:bg-white/20"
      >
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4" />
          <span>{option.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {option.costDisplay && (
            <span className="text-sm text-gray-400">{option.costDisplay}</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <button
      onClick={onSelect}
      disabled={isLoading || !canAfford}
      className={`w-full flex items-center justify-between py-3 px-4 rounded-lg transition ${
        canAfford
          ? 'bg-white/10 text-white hover:bg-white/20'
          : 'bg-white/5 text-gray-500 cursor-not-allowed'
      } disabled:opacity-50`}
    >
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4" />
        <span>{option.label}</span>
        {option.messages && (
          <span className="text-xs text-gray-400">({option.messages} messages)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{option.cost?.toLocaleString()} tokens</span>
        {option.costDisplay && (
          <span className="text-xs text-gray-400">({option.costDisplay})</span>
        )}
      </div>
    </button>
  );
}

export default ChatAccessGate;

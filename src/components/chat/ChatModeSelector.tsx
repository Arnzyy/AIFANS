'use client';

import { useState } from 'react';
import { Flame, Heart, X, MessageCircle } from 'lucide-react';
import { ChatMode } from '@/lib/sfw-chat/types';

// ===========================================
// TYPES
// ===========================================

interface ChatModeSelectorProps {
  nsfwEnabled: boolean;
  sfwEnabled: boolean;
  defaultMode: ChatMode;
  onSelectMode: (mode: ChatMode) => void;
  creatorName: string;
}

// ===========================================
// CHAT BUTTON (Profile Page)
// Shows single button or mode selector based on creator settings
// ===========================================

export function ChatButton({
  nsfwEnabled,
  sfwEnabled,
  defaultMode,
  onStartChat,
  creatorName,
}: {
  nsfwEnabled: boolean;
  sfwEnabled: boolean;
  defaultMode: ChatMode;
  onStartChat: (mode: ChatMode) => void;
  creatorName: string;
}) {
  const [showSelector, setShowSelector] = useState(false);

  // Only one mode enabled - show simple button
  if (!nsfwEnabled || !sfwEnabled) {
    const activeMode = nsfwEnabled ? 'nsfw' : 'sfw';
    return (
      <button
        onClick={() => onStartChat(activeMode)}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
      >
        <MessageCircle className="w-5 h-5" />
        Start Chat
      </button>
    );
  }

  // Both modes enabled - show with mode indicator or selector
  return (
    <>
      <div className="flex gap-2">
        {/* Main button - starts default mode */}
        <button
          onClick={() => onStartChat(defaultMode)}
          className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
        >
          <MessageCircle className="w-5 h-5" />
          Start Chat
        </button>

        {/* Mode switcher */}
        <button
          onClick={() => setShowSelector(true)}
          className="px-4 py-3 bg-white/10 rounded-xl hover:bg-white/20 transition"
          title="Choose chat mode"
        >
          {defaultMode === 'nsfw' ? (
            <Flame className="w-5 h-5 text-purple-400" />
          ) : (
            <Heart className="w-5 h-5 text-pink-400" />
          )}
        </button>
      </div>

      {/* Mode Selector Modal */}
      {showSelector && (
        <ChatModeSelector
          nsfwEnabled={nsfwEnabled}
          sfwEnabled={sfwEnabled}
          defaultMode={defaultMode}
          creatorName={creatorName}
          onSelectMode={(mode) => {
            setShowSelector(false);
            onStartChat(mode);
          }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  );
}

// ===========================================
// MODE SELECTOR MODAL
// Clean, minimal design
// ===========================================

function ChatModeSelector({
  nsfwEnabled,
  sfwEnabled,
  defaultMode,
  creatorName,
  onSelectMode,
  onClose,
}: ChatModeSelectorProps & { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-zinc-900 rounded-2xl max-w-sm w-full p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-1">Chat with {creatorName}</h2>
          <p className="text-gray-400 text-sm">Choose your experience</p>
        </div>

        {/* Mode Options */}
        <div className="space-y-3">
          {nsfwEnabled && (
            <button
              onClick={() => onSelectMode('nsfw')}
              className="w-full p-4 bg-zinc-800 hover:bg-zinc-750 rounded-xl flex items-center gap-4 transition group"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition">
                <Flame className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-medium group-hover:text-purple-400 transition">NSFW Chat</p>
                <p className="text-sm text-gray-400">Flirty & intimate</p>
              </div>
              {defaultMode === 'nsfw' && (
                <span className="ml-auto text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                  Default
                </span>
              )}
            </button>
          )}

          {sfwEnabled && (
            <button
              onClick={() => onSelectMode('sfw')}
              className="w-full p-4 bg-zinc-800 hover:bg-zinc-750 rounded-xl flex items-center gap-4 transition group"
            >
              <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition">
                <Heart className="w-6 h-6 text-pink-400" />
              </div>
              <div className="text-left">
                <p className="font-medium group-hover:text-pink-400 transition">Companion Chat</p>
                <p className="text-sm text-gray-400">Friendly & playful</p>
              </div>
              {defaultMode === 'sfw' && (
                <span className="ml-auto text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded-full">
                  Default
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// CHAT MODE BADGE (In Chat UI)
// Shows which mode is active
// ===========================================

export function ChatModeBadge({ mode }: { mode: ChatMode }) {
  if (mode === 'nsfw') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 rounded-full">
        <Flame className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-medium text-purple-400">NSFW</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-pink-500/20 rounded-full">
      <Heart className="w-3.5 h-3.5 text-pink-400" />
      <span className="text-xs font-medium text-pink-400">Companion</span>
    </div>
  );
}

// ===========================================
// MODE SWITCHER (In Chat Header)
// Allows switching modes mid-conversation
// ===========================================

export function ChatModeSwitcher({
  currentMode,
  nsfwEnabled,
  sfwEnabled,
  onSwitch,
}: {
  currentMode: ChatMode;
  nsfwEnabled: boolean;
  sfwEnabled: boolean;
  onSwitch: (mode: ChatMode) => void;
}) {
  // Only show if both modes enabled
  if (!nsfwEnabled || !sfwEnabled) return null;

  return (
    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
      <button
        onClick={() => onSwitch('nsfw')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
          currentMode === 'nsfw'
            ? 'bg-purple-500 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        <Flame className="w-4 h-4 inline mr-1" />
        NSFW
      </button>
      <button
        onClick={() => onSwitch('sfw')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
          currentMode === 'sfw'
            ? 'bg-pink-500 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        <Heart className="w-4 h-4 inline mr-1" />
        Companion
      </button>
    </div>
  );
}

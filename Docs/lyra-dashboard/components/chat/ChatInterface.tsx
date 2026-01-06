'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Gift,
  Coins,
  MoreVertical,
  ArrowLeft,
  Heart,
  Flame,
  Loader2,
  ImageIcon,
  Smile,
  History,
  Settings,
} from 'lucide-react';
import { TipButton, TipModal, TipReceivedBubble, CompactTipButton } from './TipModal';
import { WalletBalance, BuyTokensModal, TransactionHistory } from './WalletComponents';
import { ChatModeBadge, ChatModeSwitcher } from './ChatModeSelector';
import { ChatMode } from '@/lib/sfw-chat/types';
import { formatTokensAsGbp } from '@/lib/tokens/types';

// ===========================================
// TYPES
// ===========================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  is_tip_acknowledgement?: boolean;
}

interface ChatEvent {
  id: string;
  type: 'TIP_RECEIVED' | 'SUBSCRIPTION' | 'SYSTEM';
  payload: any;
  created_at: string;
}

interface ChatInterfaceProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  threadId?: string;
  chatMode: ChatMode;
  nsfwEnabled: boolean;
  sfwEnabled: boolean;
  userBalance: number;
  onBalanceChange: (newBalance: number) => void;
  onBack?: () => void;
}

// ===========================================
// MAIN CHAT INTERFACE
// ===========================================

export function ChatInterface({
  creatorId,
  creatorName,
  creatorAvatar,
  threadId: initialThreadId,
  chatMode: initialChatMode,
  nsfwEnabled,
  sfwEnabled,
  userBalance,
  onBalanceChange,
  onBack,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>(initialChatMode);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [balance, setBalance] = useState(userBalance);
  
  // Modals
  const [showTipModal, setShowTipModal] = useState(false);
  const [showBuyTokens, setShowBuyTokens] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, events]);

  // Load existing messages
  useEffect(() => {
    if (threadId) {
      loadMessages();
    }
  }, [threadId, chatMode]);

  const loadMessages = async () => {
    // TODO: Fetch messages from API
    // const endpoint = chatMode === 'sfw' ? '/api/sfw-chat' : '/api/nsfw-chat';
    // const response = await fetch(`${endpoint}/${creatorId}?thread_id=${threadId}`);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSending(true);

    try {
      const endpoint = chatMode === 'sfw' 
        ? `/api/sfw-chat/${creatorId}` 
        : `/api/nsfw-chat/${creatorId}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          threadId,
        }),
      });

      const data = await response.json();

      if (data.reply) {
        const assistantMessage: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }

      // Handle token cost for extra messages
      if (data.cost && data.new_balance !== undefined) {
        setBalance(data.new_balance);
        onBalanceChange(data.new_balance);
      }

    } catch (error) {
      console.error('Send message error:', error);
      // TODO: Show error toast
    } finally {
      setSending(false);
    }
  };

  const handleTipSent = async (amount: number, tipId: string) => {
    // Update balance
    const newBalance = balance - amount;
    setBalance(newBalance);
    onBalanceChange(newBalance);

    // Add tip event to chat
    const tipEvent: ChatEvent = {
      id: `event-${Date.now()}`,
      type: 'TIP_RECEIVED',
      payload: { amount_tokens: amount, tip_id: tipId },
      created_at: new Date().toISOString(),
    };
    setEvents((prev) => [...prev, tipEvent]);

    // The AI acknowledgement will come from the next API response
    // or we can trigger it here
    await triggerTipAcknowledgement(amount);
  };

  const triggerTipAcknowledgement = async (amount: number) => {
    try {
      const endpoint = chatMode === 'sfw' 
        ? `/api/sfw-chat/${creatorId}` 
        : `/api/nsfw-chat/${creatorId}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          event_type: 'TIP_RECEIVED',
          event_payload: { amount_tokens: amount },
        }),
      });

      const data = await response.json();

      if (data.reply) {
        const acknowledgementMessage: Message = {
          id: `ack-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          created_at: new Date().toISOString(),
          is_tip_acknowledgement: true,
        };
        setMessages((prev) => [...prev, acknowledgementMessage]);
      }
    } catch (error) {
      console.error('Tip acknowledgement error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleModeSwitch = (newMode: ChatMode) => {
    setChatMode(newMode);
    setMessages([]); // Clear messages when switching modes
    setThreadId(undefined); // Reset thread
  };

  // Combine messages and events for rendering
  const renderItems = [
    ...messages.map((m) => ({ ...m, itemType: 'message' as const })),
    ...events.map((e) => ({ ...e, itemType: 'event' as const })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-950">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
            {creatorName.charAt(0)}
          </div>
          <div>
            <p className="font-medium">{creatorName}</p>
            <ChatModeBadge mode={chatMode} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wallet Balance */}
          <WalletBalance
            balance={balance}
            onBuyTokens={() => setShowBuyTokens(true)}
            compact
          />

          {/* Mode Switcher */}
          {nsfwEnabled && sfwEnabled && (
            <ChatModeSwitcher
              currentMode={chatMode}
              nsfwEnabled={nsfwEnabled}
              sfwEnabled={sfwEnabled}
              onSwitch={handleModeSwitch}
            />
          )}

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/5 rounded-lg transition"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowHistory(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-center gap-3"
                  >
                    <History className="w-4 h-4" />
                    Transaction History
                  </button>
                  <button
                    onClick={() => {
                      setShowBuyTokens(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-center gap-3"
                  >
                    <Coins className="w-4 h-4" />
                    Buy Tokens
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renderItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
              {chatMode === 'nsfw' ? (
                <Flame className="w-10 h-10 text-purple-400" />
              ) : (
                <Heart className="w-10 h-10 text-pink-400" />
              )}
            </div>
            <h3 className="text-xl font-bold mb-2">Start chatting with {creatorName}</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              {chatMode === 'nsfw'
                ? 'Flirty and intimate conversations await...'
                : 'Warm, playful conversations await...'}
            </p>
          </div>
        ) : (
          renderItems.map((item) =>
            item.itemType === 'event' ? (
              item.type === 'TIP_RECEIVED' && (
                <TipReceivedBubble
                  key={item.id}
                  amount={item.payload.amount_tokens}
                  timestamp={item.created_at}
                />
              )
            ) : (
              <MessageBubble
                key={item.id}
                message={item}
                creatorName={creatorName}
              />
            )
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-zinc-950">
        <div className="flex items-end gap-2">
          {/* Tip Button */}
          <CompactTipButton onClick={() => setShowTipModal(true)} />

          {/* Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${creatorName}...`}
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-zinc-800 border border-white/10 rounded-xl resize-none focus:outline-none focus:border-purple-500 max-h-32"
              style={{ minHeight: '48px' }}
            />
            <button className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-white transition">
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Tip hint */}
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send • Tip to show appreciation 💕
        </p>
      </div>

      {/* Modals */}
      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        creatorName={creatorName}
        creatorId={creatorId}
        threadId={threadId}
        chatMode={chatMode}
        userBalance={balance}
        onTipSent={handleTipSent}
        onBuyTokens={() => {
          setShowTipModal(false);
          setShowBuyTokens(true);
        }}
      />

      <BuyTokensModal
        isOpen={showBuyTokens}
        onClose={() => setShowBuyTokens(false)}
        currentBalance={balance}
        onPurchaseComplete={(newBalance) => {
          setBalance(newBalance);
          onBalanceChange(newBalance);
        }}
      />

      <TransactionHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}

// ===========================================
// MESSAGE BUBBLE
// ===========================================

function MessageBubble({
  message,
  creatorName,
}: {
  message: Message;
  creatorName: string;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl rounded-br-md'
            : 'bg-zinc-800 rounded-2xl rounded-bl-md'
        } ${message.is_tip_acknowledgement ? 'ring-2 ring-pink-500/30' : ''}`}
      >
        <div className="px-4 py-3">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className={`px-4 pb-2 text-xs ${isUser ? 'text-white/60' : 'text-gray-500'}`}>
          {new Date(message.created_at).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {message.is_tip_acknowledgement && (
            <span className="ml-2 text-pink-400">💕 Tip thank you</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// EXPORTS
// ===========================================

export { TipButton, TipModal, TipReceivedBubble } from './TipModal';
export { WalletBalance, BuyTokensModal, TransactionHistory, LowBalanceWarning } from './WalletComponents';

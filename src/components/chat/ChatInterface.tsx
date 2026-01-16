'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image, MoreVertical } from 'lucide-react';
import { InChatContentBrowser } from './InChatContentBrowser';

// ===========================================
// TYPES
// ===========================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  content_reference?: {
    id: string;
    type: 'image' | 'video';
    thumbnail_url: string;
  };
}

interface Creator {
  id: string;
  persona_name: string;
  avatar_url: string;
  is_online?: boolean;
}

interface ChatInterfaceProps {
  creator: Creator;
  initialMessages?: Message[];
}

// ===========================================
// MAIN CHAT INTERFACE
// ===========================================

export function ChatInterface({
  creator,
  initialMessages = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContentBrowser, setShowContentBrowser] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history
  useEffect(() => {
    loadChatHistory();
  }, [creator.id]);

  const loadChatHistory = async () => {
    try {
      const res = await fetch(`/api/chat/${creator.id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/chat/${creator.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await res.json();

      if (res.ok) {
        const aiMessage: Message = {
          id: Date.now().toString() + '_ai',
          role: 'assistant',
          content: data.response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        if (data.messages_remaining !== null) {
          setMessagesRemaining(data.messages_remaining);
        }
      } else {
        // Handle errors
        if (res.status === 429) {
          // Message limit reached
          alert(
            'Daily message limit reached. Buy more messages to continue chatting!'
          );
        } else if (res.status === 402) {
          // Chat add-on required
          alert('Chat add-on required. Upgrade to unlock private chat!');
        } else {
          throw new Error(data.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      // Remove the user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInput(userMessage.content);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle content mention from browser
  const handleContentMention = (content: any) => {
    setInput(
      (prev) =>
        prev + ` [about your ${content.type}: ${content.title || 'recent post'}] `
    );
    setShowContentBrowser(false);
    inputRef.current?.focus();
  };

  return (
    <div className="chat-page-container flex flex-col bg-black">
      {/* Chat Header - sticky + z-50 for iOS Safari */}
      <div className="flex-shrink-0 sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-950 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={creator.avatar_url}
              alt={creator.persona_name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {creator.is_online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-950" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">{creator.persona_name}</h2>
            <p className="text-xs text-green-400">Online</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Content Browser Button */}
          <button
            onClick={() => setShowContentBrowser(true)}
            className="p-2 hover:bg-white/10 rounded-full transition"
            title="Browse Content"
          >
            <Image className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-full transition">
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages Remaining Banner */}
      {messagesRemaining !== null && messagesRemaining <= 5 && (
        <div className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-purple-500/30">
          <p className="text-sm text-center">
            <span className="text-purple-400 font-semibold">
              {messagesRemaining}
            </span>{' '}
            messages remaining today
            {messagesRemaining <= 2 && (
              <a href="/messages/buy" className="ml-2 text-pink-400 underline">
                Buy more
              </a>
            )}
          </p>
        </div>
      )}

      {/* Messages Area - overscroll-contain for iOS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-3xl">💕</span>
            </div>
            <h3 className="font-semibold mb-2">
              Start chatting with {creator.persona_name}
            </h3>
            <p className="text-gray-500 text-sm">
              Say hi and see where the conversation goes...
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            creatorAvatar={creator.avatar_url}
          />
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <img
              src={creator.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full"
            />
            <div className="bg-white/10 rounded-2xl px-4 py-2">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - sticky + z-50 for iOS Safari */}
      <div className="flex-shrink-0 sticky bottom-0 z-50 p-4 border-t border-white/10 bg-zinc-950 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2">
          {/* Content button */}
          <button
            onClick={() => setShowContentBrowser(true)}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <Image className="w-5 h-5 text-gray-400" />
          </button>

          {/* Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={`Message ${creator.persona_name}...`}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 text-base"
              disabled={isLoading}
            />
          </div>

          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full disabled:opacity-50 transition hover:opacity-90"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Tip text */}
        <p className="text-xs text-gray-500 text-center mt-2">
          Tap the image icon to browse and reference {creator.persona_name}&apos;s
          content
        </p>
      </div>

      {/* Content Browser Overlay */}
      <InChatContentBrowser
        creatorId={creator.id}
        creatorName={creator.persona_name}
        isOpen={showContentBrowser}
        onClose={() => setShowContentBrowser(false)}
        onSendToChat={handleContentMention}
      />
    </div>
  );
}

// ===========================================
// MESSAGE BUBBLE
// ===========================================

function MessageBubble({
  message,
  creatorAvatar,
}: {
  message: Message;
  creatorAvatar: string;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <img
          src={creatorAvatar}
          alt=""
          className="w-8 h-8 rounded-full flex-shrink-0"
        />
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
            : 'bg-white/10 text-white'
        }`}
      >
        {/* Content reference if any */}
        {message.content_reference && (
          <div className="mb-2 rounded-lg overflow-hidden">
            <img
              src={message.content_reference.thumbnail_url}
              alt=""
              className="w-32 h-32 object-cover"
            />
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        <p
          className={`text-xs mt-1 ${isUser ? 'text-white/60' : 'text-gray-500'}`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

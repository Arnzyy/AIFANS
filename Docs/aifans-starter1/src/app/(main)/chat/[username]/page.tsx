'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { AI_CHAT_DISCLOSURE } from '@/lib/compliance/constants';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function AIChatPage({
  params,
}: {
  params: { username: string };
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creator, setCreator] = useState<any>(null);
  const [personality, setPersonality] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showDisclosure, setShowDisclosure] = useState(true);

  useEffect(() => {
    initializeChat();
  }, [params.username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    setLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirect=/chat/${params.username}`);
      return;
    }

    // Get creator profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, creator_profiles(*)')
      .eq('username', params.username.toLowerCase())
      .eq('role', 'creator')
      .single();

    if (!profile) {
      router.push('/explore');
      return;
    }
    setCreator(profile);

    // Check if AI chat is enabled
    if (!profile.creator_profiles?.ai_chat_enabled) {
      router.push(`/${params.username}`);
      return;
    }

    // Load AI chat session
    const res = await fetch(`/api/ai-chat/${profile.id}`);
    if (res.ok) {
      const data = await res.json();
      setPersonality(data.personality);
      setMessages(data.messages || []);
    }

    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !creator || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      role: 'assistant',
      content: '...',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const res = await fetch(`/api/ai-chat/${creator.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });

      const data = await res.json();

      // Remove typing indicator and add actual response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing');
        if (data.message) {
          return [...filtered, data.message];
        }
        return filtered;
      });
    } catch (err) {
      // Remove typing indicator on error
      setMessages(prev => prev.filter(m => m.id !== 'typing'));
    }

    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Disclosure modal */}
      {showDisclosure && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <span className="text-4xl">🤖</span>
              <h2 className="text-xl font-bold mt-3">AI Chat</h2>
            </div>
            
            <p className="text-gray-400 text-sm text-center">
              {AI_CHAT_DISCLOSURE.long}
            </p>

            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-purple-300 text-center">
                💡 This is a fictional AI character. All interactions are for entertainment purposes.
              </p>
            </div>

            <button
              onClick={() => setShowDisclosure(false)}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 px-4 h-16">
          <Link href={`/${creator?.username}`} className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
          
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                {creator?.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">👤</div>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 text-sm">🤖</span>
            </div>
            <div>
              <p className="font-medium">{personality?.name || creator?.display_name || creator?.username}</p>
              <p className="text-xs text-green-400">AI • Online</p>
            </div>
          </div>

          <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-full">
            AI Chat
          </span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-white/10 mx-auto mb-4 overflow-hidden">
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
              )}
            </div>
            <h3 className="font-semibold text-lg">
              {personality?.name || creator?.display_name || creator?.username}
            </h3>
            <p className="text-gray-500 text-sm mt-1">Start a conversation...</p>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          const isTyping = message.id === 'typing';
          
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden mr-2 flex-shrink-0">
                  {creator?.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                  )}
                </div>
              )}
              
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  isUser
                    ? 'bg-purple-500 rounded-br-md'
                    : 'bg-white/10 rounded-bl-md'
                } ${isTyping ? 'animate-pulse' : ''}`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                {!isTyping && (
                  <p className={`text-xs mt-1 ${isUser ? 'text-purple-200' : 'text-gray-500'}`}>
                    {formatTime(new Date(message.created_at))}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-white/10 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${personality?.name || creator?.display_name || 'AI'}...`}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">
          Responses are AI-generated • {personality?.name || 'AI'} is a fictional character
        </p>
      </form>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

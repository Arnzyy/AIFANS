'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { AI_CHAT_DISCLOSURE } from '@/lib/compliance/constants';
import { getCreatorByUsername } from '@/lib/data/creators';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_ai_generated: boolean;
}

interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  creator_profiles: {
    ai_chat_enabled: boolean;
    bio: string | null;
  } | null;
}

export default function AIChatPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(true);

  useEffect(() => {
    loadChat();
  }, [username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const loadChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/chat/' + username);
        return;
      }
      setCurrentUser(user);

      // Try to fetch the creator from database first
      const { data: creatorData } = await supabase
        .from('profiles')
        .select(`
          id, username, display_name, avatar_url,
          creator_profiles(ai_chat_enabled, bio)
        `)
        .eq('username', username.toLowerCase())
        .eq('role', 'creator')
        .single();

      // Handle creator_profiles which may be array or object from Supabase
      const creatorProfiles = Array.isArray(creatorData?.creator_profiles)
        ? creatorData.creator_profiles[0]
        : creatorData?.creator_profiles;

      if (creatorData && creatorProfiles?.ai_chat_enabled) {
        // Real creator from database
        setCreator({
          ...creatorData,
          creator_profiles: creatorProfiles,
        } as Creator);
      } else {
        // Try mock creators
        const mockCreator = getCreatorByUsername(username.toLowerCase());
        if (!mockCreator || !mockCreator.hasAiChat) {
          router.push(`/${username}`);
          return;
        }
        // Use mock creator data
        setCreator({
          id: mockCreator.id,
          username: mockCreator.username,
          display_name: mockCreator.displayName,
          avatar_url: mockCreator.avatar,
          creator_profiles: {
            ai_chat_enabled: true,
            bio: mockCreator.bio,
          },
        } as Creator);
        setLoading(false);
        return; // Skip conversation creation for mock creators
      }

      // Find or create AI chat conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${creatorData.id}),` +
          `and(participant1_id.eq.${creatorData.id},participant2_id.eq.${user.id})`
        )
        .eq('is_ai_enabled', true)
        .single();

      let convId: string;

      if (existingConv) {
        convId = existingConv.id;
        setShowDisclosure(false); // Already chatted before
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: creatorData.id,
            is_ai_enabled: true
          })
          .select('id')
          .single();

        if (!newConv) {
          throw new Error('Failed to create conversation');
        }
        convId = newConv.id;
      }

      setConversationId(convId);

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      setMessages(messagesData || []);

    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !creator || sending) return;

    setShowDisclosure(false);
    setSending(true);
    setTyping(true);

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      sender_id: currentUser.id,
      receiver_id: creator.id,
      created_at: new Date().toISOString(),
      is_ai_generated: false
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Check if this is a mock creator (ID doesn't look like UUID)
      const isMockCreator = !creator.id.includes('-') || creator.id.length < 30;

      if (isMockCreator) {
        // For mock creators, call the mock AI endpoint
        const response = await fetch('/api/ai-chat/mock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorUsername: creator.username,
            creatorName: creator.display_name,
            message: messageContent,
            conversationHistory: messages.slice(-10).map(m => ({
              role: m.sender_id === currentUser.id ? 'user' : 'assistant',
              content: m.content
            }))
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send message');
        }

        // Add AI response
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          content: data.response,
          sender_id: creator.id,
          receiver_id: currentUser.id,
          created_at: new Date().toISOString(),
          is_ai_generated: true
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // Call real AI chat API for database creators
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorId: creator.id,
            message: messageContent,
            conversationId
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send message');
        }

        // Update conversation ID if new
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        // Add AI response
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          content: data.response,
          sender_id: creator.id,
          receiver_id: currentUser.id,
          created_at: new Date().toISOString(),
          is_ai_generated: true
        };
        setMessages(prev => [...prev, aiMsg]);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setNewMessage(messageContent);

      if (error.message.includes('Insufficient balance')) {
        // Show wallet prompt
        router.push('/wallet?add=true&return=/chat/' + username);
      }
    } finally {
      setSending(false);
      setTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 px-4 h-16">
          <Link
            href={`/${username}`}
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </Link>

          {creator && (
            <Link href={`/${creator.username}`} className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">
                      {(creator.display_name || creator.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs">
                  AI
                </div>
              </div>
              <div>
                <p className="font-medium flex items-center gap-2">
                  {creator.display_name || creator.username}
                  <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                    AI Chat
                  </span>
                </p>
                <p className="text-xs text-gray-500">@{creator.username}</p>
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* AI Disclosure Banner */}
      {showDisclosure && (
        <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
          <p className="text-sm text-center text-purple-200">
            {AI_CHAT_DISCLOSURE.medium}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">
                {creator?.avatar_url ? (
                  <img
                    src={creator.avatar_url}
                    alt=""
                    className="w-20 h-20 rounded-full mx-auto object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl">
                    {(creator?.display_name || creator?.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Chat with {creator?.display_name || creator?.username}
              </h3>
              <p className="text-gray-400 max-w-sm mx-auto">
                Start a conversation! This is an AI-powered chat that&apos;s available 24/7.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && creator && (
                    <div className="w-8 h-8 rounded-full mr-2 flex-shrink-0 overflow-hidden">
                      {creator.avatar_url ? (
                        <img
                          src={creator.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm">
                          {(creator.display_name || creator.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                      isOwn
                        ? 'bg-purple-500 text-white rounded-br-md'
                        : 'bg-white/10 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-purple-200' : 'text-gray-500'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {typing && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full mr-2 flex-shrink-0 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                {creator?.avatar_url && (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/10 rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4 bg-black">
        <form onSubmit={sendMessage} className="max-w-2xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? '...' : 'Send'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-500 mt-2">
          AI responses may not reflect the creator&apos;s actual views
        </p>
      </div>
    </div>
  );
}

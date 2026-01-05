'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
  is_ai_generated: boolean;
}

interface OtherUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConversation();
  }, [username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: { new: Record<string, unknown> }) => {
          const newMsg = payload.new as unknown as Message;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/messages/' + username);
        return;
      }
      setCurrentUser(user);

      // Fetch the other user from profiles
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('username', username.toLowerCase())
        .single();

      if (!userData) {
        // User not found in database - may be a mock creator
        // Show a message instead of redirecting
        setOtherUser({
          id: 'mock-' + username,
          username: username.toLowerCase(),
          display_name: username,
          avatar_url: null,
        });
        setLoading(false);
        return;
      }
      setOtherUser(userData);

      // Find or create conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${userData.id}),` +
          `and(participant1_id.eq.${userData.id},participant2_id.eq.${user.id})`
        )
        .single();

      let convId: string;

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: userData.id
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

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', convId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);

    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !otherUser || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          receiver_id: otherUser.id,
          content: messageContent,
          is_ai_generated: false
        });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
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
            href="/messages"
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </Link>

          {otherUser && (
            <Link href={`/${otherUser.username}`} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                {otherUser.avatar_url ? (
                  <img
                    src={otherUser.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    {(otherUser.display_name || otherUser.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">
                  {otherUser.display_name || otherUser.username}
                </p>
                <p className="text-xs text-gray-500">@{otherUser.username}</p>
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {otherUser?.id.startsWith('mock-') ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">Messaging coming soon</h3>
              <p className="text-gray-400 mb-4">
                Direct messaging with {otherUser.display_name} will be available soon.
              </p>
              <p className="text-sm text-gray-500">
                In the meantime, try AI Chat if available!
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No messages yet. Say hello!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
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
                      {message.is_ai_generated && (
                        <span className="ml-2 opacity-70">AI</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - only show for real users */}
      {!otherUser?.id.startsWith('mock-') && (
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
        </div>
      )}
    </div>
  );
}

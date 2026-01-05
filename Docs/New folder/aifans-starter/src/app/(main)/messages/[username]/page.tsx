'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export default function ConversationPage({
  params,
}: {
  params: { username: string };
}) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

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
      router.push('/login');
      return;
    }
    setCurrentUser(user);

    // Get other user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', params.username.toLowerCase())
      .single();

    if (!profile) {
      router.push('/messages');
      return;
    }
    setOtherUser(profile);

    // Get or create conversation
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: profile.id }),
    });
    
    const { conversation: conv } = await res.json();
    setConversation(conv);

    // Load messages
    if (conv) {
      const messagesRes = await fetch(`/api/messages/${conv.id}`);
      const { messages: msgs } = await messagesRes.json();
      setMessages(msgs || []);
    }

    setLoading(false);

    // Subscribe to new messages
    if (conv) {
      const channel = supabase
        .channel(`messages:${conv.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conv.id}`,
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const res = await fetch(`/api/messages/${conversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
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
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-4 px-4 h-16">
          <Link href="/messages" className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </Link>
          
          <Link href={`/${otherUser?.username}`} className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
              {otherUser?.avatar_url ? (
                <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">👤</div>
              )}
            </div>
            <div>
              <p className="font-medium">{otherUser?.display_name || otherUser?.username}</p>
              <p className="text-xs text-gray-500">@{otherUser?.username}</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages yet. Say hi! 👋</p>
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
                  className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-purple-500 rounded-br-md'
                      : 'bg-white/10 rounded-bl-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-purple-200' : 'text-gray-500'}`}>
                    {formatTime(new Date(message.created_at))}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-white/10 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Chat {
  model_id: string;
  model_name: string;
  username: string;
  avatar: string | null;
  last_message: {
    content: string;
    is_from_user: boolean;
    created_at: string;
  } | null;
  last_active: string;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Chats</h1>
          <p className="text-gray-400 mt-1">Your AI model conversations</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Chats</h1>
        <p className="text-gray-400 mt-1">Your AI model conversations</p>
      </div>

      {/* Chats */}
      {chats && chats.length > 0 ? (
        <div className="space-y-2">
          {chats.map((chat) => (
            <Link
              key={chat.model_id}
              href={`/chat/${chat.model_id}`}
              className="flex items-center gap-4 p-4 rounded-xl border bg-zinc-900 border-white/10 hover:border-white/20 transition-colors group"
            >
              {/* Avatar with AI Badge */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-white/10 overflow-hidden">
                  {chat.avatar ? (
                    <img
                      src={chat.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-medium">
                      {chat.model_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* AI Badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center border-2 border-zinc-900">
                  <Sparkles className="w-3 h-3" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-medium truncate group-hover:text-purple-400 transition-colors">
                    {chat.model_name}
                  </p>
                  {chat.last_message && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatDistanceToNow(new Date(chat.last_message.created_at), {
                        addSuffix: true,
                        includeSeconds: false
                      })}
                    </span>
                  )}
                </div>

                {chat.last_message ? (
                  <p className="text-sm text-gray-400 truncate">
                    {chat.last_message.is_from_user ? 'You: ' : ''}
                    {chat.last_message.content}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No messages yet</p>
                )}
              </div>

              {/* Arrow indicator */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl bg-zinc-900 border border-white/10">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold mb-2">No chats yet</h3>
          <p className="text-gray-400 mb-6">Subscribe to AI models to start chatting</p>
          <Link
            href="/explore"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Explore Models
          </Link>
        </div>
      )}
    </div>
  );
}

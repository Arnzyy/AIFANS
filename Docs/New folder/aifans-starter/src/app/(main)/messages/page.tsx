import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function MessagesPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/messages');
  }

  // Get conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      *,
      participant1:profiles!conversations_participant1_id_fkey(id, username, display_name, avatar_url),
      participant2:profiles!conversations_participant2_id_fkey(id, username, display_name, avatar_url),
      messages(content, created_at, sender_id)
    `)
    .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      {/* Conversations */}
      {conversations && conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const otherUser = conv.participant1_id === user.id 
              ? conv.participant2 
              : conv.participant1;
            
            const lastMessage = conv.messages?.[0];
            const isUnread = lastMessage && lastMessage.sender_id !== user.id && !conv.is_read;

            return (
              <Link
                key={conv.id}
                href={`/messages/${otherUser.username}`}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  isUnread 
                    ? 'bg-purple-500/10 border-purple-500/30' 
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                    {otherUser.avatar_url ? (
                      <img 
                        src={otherUser.avatar_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                    )}
                  </div>
                  {isUnread && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium truncate ${isUnread ? 'text-white' : ''}`}>
                      {otherUser.display_name || otherUser.username}
                    </p>
                    {lastMessage && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(new Date(lastMessage.created_at))}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className={`text-sm truncate ${isUnread ? 'text-gray-300' : 'text-gray-500'}`}>
                      {lastMessage.sender_id === user.id ? 'You: ' : ''}
                      {lastMessage.content}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl bg-white/5 border border-white/10">
          <div className="text-5xl mb-4">💬</div>
          <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
          <p className="text-gray-400 mb-6">Subscribe to creators to start chatting</p>
          <Link
            href="/explore"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Explore Creators
          </Link>
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  
  return date.toLocaleDateString();
}

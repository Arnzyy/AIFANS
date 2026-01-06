import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export default async function MessagesPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get conversations where creator is participant
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id,
      participant1_id,
      participant2_id,
      last_message_at,
      messages (
        content,
        created_at,
        sender_id
      )
    `)
    .or(`participant1_id.eq.${user?.id},participant2_id.eq.${user?.id}`)
    .order('last_message_at', { ascending: false })
    .limit(20);

  // Get profiles for all participants
  const participantIds = conversations?.flatMap(c =>
    [c.participant1_id, c.participant2_id].filter(id => id !== user?.id)
  ) || [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', participantIds);

  const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-gray-400 mt-1">Chat with your subscribers</p>
      </div>

      {conversations && conversations.length > 0 ? (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const otherUserId = conversation.participant1_id === user?.id
              ? conversation.participant2_id
              : conversation.participant1_id;

            const otherProfile = profilesMap.get(otherUserId);
            const lastMessage = conversation.messages?.[0];

            return (
              <Link
                key={conversation.id}
                href={`/messages/${otherProfile?.username || otherUserId}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium">
                      {otherProfile?.display_name || otherProfile?.username || 'User'}
                    </p>
                    {lastMessage && (
                      <span className="text-xs text-gray-500">
                        {new Date(lastMessage.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {lastMessage && (
                    <p className="text-sm text-gray-400 truncate">
                      {lastMessage.sender_id === user?.id ? 'You: ' : ''}
                      {lastMessage.content}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl bg-white/5 border border-white/10">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400">No messages yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Your subscriber conversations will appear here
          </p>
        </div>
      )}
    </div>
  );
}

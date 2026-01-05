import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/messages/[conversationId] - Get messages in conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is participant
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', params.conversationId)
    .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const before = searchParams.get('before');

  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(
        id, username, display_name, avatar_url
      )
    `)
    .eq('conversation_id', params.conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data: messages, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mark messages as read
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', params.conversationId)
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  return NextResponse.json({
    messages: messages?.reverse() || [],
    conversation,
  });
}

// POST /api/messages/[conversationId] - Send message
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is participant
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', params.conversationId)
    .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const body = await request.json();
  const { content, media_url } = body;

  if (!content && !media_url) {
    return NextResponse.json({ error: 'Message content required' }, { status: 400 });
  }

  // Determine receiver
  const receiverId = conversation.participant1_id === user.id
    ? conversation.participant2_id
    : conversation.participant1_id;

  // Create message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      media_url,
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(
        id, username, display_name, avatar_url
      )
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', params.conversationId);

  return NextResponse.json({ message }, { status: 201 });
}

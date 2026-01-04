import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/messages - Get all conversations
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participant1:profiles!conversations_participant1_id_fkey(
        id, username, display_name, avatar_url
      ),
      participant2:profiles!conversations_participant2_id_fkey(
        id, username, display_name, avatar_url
      )
    `)
    .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get last message for each conversation
  if (conversations) {
    for (const conv of conversations) {
      const { data: lastMessage } = await supabase
        .from('messages')
        .select('content, created_at, sender_id')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      (conv as any).last_message = lastMessage;
    }
  }

  return NextResponse.json({ conversations });
}

// POST /api/messages - Create new conversation or get existing
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { recipient_id } = body;

  if (!recipient_id) {
    return NextResponse.json({ error: 'Recipient required' }, { status: 400 });
  }

  // Check for existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${recipient_id}),and(participant1_id.eq.${recipient_id},participant2_id.eq.${user.id})`)
    .single();

  if (existing) {
    return NextResponse.json({ conversation: existing });
  }

  // Create new conversation
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      participant1_id: user.id,
      participant2_id: recipient_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversation }, { status: 201 });
}

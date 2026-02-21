// ===========================================
// API ROUTE: /api/voice/realtime/session/[sessionId]/transcript
// GET - Get full conversation transcript
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createServerClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from('voice_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('voice_session_messages')
      .select('id, role, content, audio_url, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[VoiceTranscript] Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch transcript' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId,
      messages: messages || [],
      messageCount: messages?.length || 0,
    });
  } catch (error) {
    console.error('[VoiceTranscript] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}

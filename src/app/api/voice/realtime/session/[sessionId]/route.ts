// ===========================================
// API ROUTE: /api/voice/realtime/session/[sessionId]
// GET - Get session status
// PATCH - Update session (end it)
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// ===========================================
// GET - Fetch session status
// ===========================================

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

    // Fetch session
    const { data: session, error } = await supabase
      .from('voice_sessions')
      .select(`
        id,
        user_id,
        creator_id,
        personality_id,
        status,
        started_at,
        ended_at,
        duration_seconds,
        total_input_tokens,
        total_output_tokens,
        total_audio_seconds,
        estimated_cost_cents
      `)
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify ownership
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('[VoiceSession GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// ===========================================
// PATCH - Update session (e.g., end it)
// ===========================================

export async function PATCH(
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

    // Parse body
    const body = await request.json();
    const { action, reason } = body;

    // Fetch session
    const { data: session, error: fetchError } = await supabase
      .from('voice_sessions')
      .select('id, user_id, status, started_at')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify ownership
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'end') {
      // Calculate duration
      const startedAt = new Date(session.started_at).getTime();
      const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

      // Update session
      const { data: updated, error: updateError } = await supabase
        .from('voice_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) {
        console.error('[VoiceSession PATCH] Error ending session:', updateError);
        return NextResponse.json(
          { error: 'Failed to end session' },
          { status: 500 }
        );
      }

      // Update voice usage
      const durationMinutes = Math.ceil(durationSeconds / 60);
      await supabase.rpc('increment_voice_usage', {
        p_user_id: user.id,
        p_minutes: durationMinutes,
      });

      console.log('[VoiceSession PATCH] Session ended:', {
        sessionId,
        durationSeconds,
        durationMinutes,
        reason,
      });

      return NextResponse.json({ session: updated });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[VoiceSession PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

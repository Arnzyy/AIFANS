// ===========================================
// API ROUTE: /api/chat/[creatorId]/tip-ack
// Marks a tip for acknowledgement in the next chat message
// (No longer generates standalone responses - tips are acknowledged naturally)
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const supabase = await createServerClient();

    // Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tipId, tipAmount, conversationId } = await request.json();

    if (!tipAmount) {
      return NextResponse.json({ error: 'Missing tipAmount' }, { status: 400 });
    }

    // Mark the tip for acknowledgement in the next message
    // The main chat route will pick this up and inject it into the system prompt
    if (tipId) {
      await supabase
        .from('tips')
        .update({
          metadata: {
            needs_acknowledgement: true,
            acknowledged_at: null,
          },
        })
        .eq('id', tipId);

      console.log('[Tip] Marked for acknowledgement:', tipId, tipAmount, 'tokens');
    } else if (conversationId) {
      // If no tipId, try to mark the most recent tip for this conversation
      const { data: recentTip } = await supabase
        .from('tips')
        .select('id')
        .eq('thread_id', conversationId)
        .eq('user_id', user.id)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentTip) {
        await supabase
          .from('tips')
          .update({
            metadata: {
              needs_acknowledgement: true,
              acknowledged_at: null,
            },
          })
          .eq('id', recentTip.id);

        console.log('[Tip] Marked recent tip for acknowledgement:', recentTip.id);
      }
    }

    // Return success - the tip will be acknowledged in the user's next message
    return NextResponse.json({
      success: true,
      message: 'Tip will be acknowledged in next chat message',
    });
  } catch (error) {
    console.error('Tip acknowledgement error:', error);
    return NextResponse.json({ error: 'Failed to mark tip' }, { status: 500 });
  }
}

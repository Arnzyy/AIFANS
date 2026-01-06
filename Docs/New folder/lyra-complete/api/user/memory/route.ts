// ===========================================
// API ROUTE: /api/user/memory/route.ts
// User controls for memory (view, clear, export)
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET - View memory or export data
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Export all data (GDPR)
    if (action === 'export') {
      const [memory, messages, settings] = await Promise.all([
        supabase.from('user_memory').select('*').eq('subscriber_id', user.id),
        supabase.from('chat_messages').select('*').eq('subscriber_id', user.id),
        supabase.from('memory_settings').select('*').eq('user_id', user.id),
      ]);

      return NextResponse.json({
        memory: memory.data,
        chat_history: messages.data,
        settings: settings.data,
        exported_at: new Date().toISOString(),
      });
    }

    // Get memory
    const { data: memory } = await supabase
      .from('user_memory')
      .select('*')
      .eq('subscriber_id', user.id);
    
    return NextResponse.json({ memory });

  } catch (error) {
    console.error('Get memory error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE - Clear memory
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await supabase.from('user_memory').delete().eq('subscriber_id', user.id);
    await supabase.from('conversation_summaries').delete().eq('subscriber_id', user.id);

    return NextResponse.json({ success: true, message: 'Memory cleared' });

  } catch (error) {
    console.error('Clear memory error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH - Update settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memory_enabled, consent_given } = await request.json();

    const updates: any = { updated_at: new Date().toISOString() };
    
    if (typeof memory_enabled === 'boolean') {
      updates.memory_enabled = memory_enabled;
    }
    
    if (consent_given === true) {
      updates.consent_given = true;
      updates.consent_timestamp = new Date().toISOString();
    }

    const { data } = await supabase
      .from('memory_settings')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();

    return NextResponse.json({ settings: data });

  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

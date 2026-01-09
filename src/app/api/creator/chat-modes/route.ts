// ===========================================
// API ROUTE: /api/creator/chat-modes/route.ts
// Manage which chat modes are enabled
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET - Get creator's chat mode settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('creator_chat_modes')
      .select('*')
      .eq('creator_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings yet - return defaults (NSFW enabled for backwards compat)
      return NextResponse.json({
        nsfw_enabled: true,
        sfw_enabled: false,
        default_mode: 'nsfw',
      });
    }

    if (error) throw error;

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Get chat modes error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST/PUT - Update chat mode settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nsfw_enabled, sfw_enabled, default_mode, linked_model_id } = body;

    // Validate
    if (typeof nsfw_enabled !== 'boolean' || typeof sfw_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
    }

    if (default_mode && !['nsfw', 'sfw'].includes(default_mode)) {
      return NextResponse.json({ error: 'Invalid default mode' }, { status: 400 });
    }

    // Ensure default mode is valid based on what's enabled
    let validDefaultMode = default_mode || 'nsfw';
    if (!nsfw_enabled && sfw_enabled) {
      validDefaultMode = 'sfw';
    } else if (nsfw_enabled && !sfw_enabled) {
      validDefaultMode = 'nsfw';
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('creator_chat_modes')
      .upsert({
        creator_id: user.id,
        nsfw_enabled,
        sfw_enabled,
        default_mode: validDefaultMode,
        linked_model_id: linked_model_id || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'creator_id',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);

  } catch (error) {
    console.error('Update chat modes error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

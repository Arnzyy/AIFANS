// ===========================================
// API ROUTE: /api/creator/sfw-personality/route.ts
// Manage SFW/Companion chat personality
// COMPLETELY SEPARATE FROM NSFW PERSONALITY
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { DEFAULT_SFW_CONFIG, SFWPersonalityConfig } from '@/lib/sfw-chat/types';

// GET - Get creator's SFW personality config
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: config, error } = await supabase
      .from('sfw_ai_personalities')
      .select('*')
      .eq('creator_id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No config yet - return defaults
      return NextResponse.json({
        ...DEFAULT_SFW_CONFIG,
        creator_id: user.id,
      });
    }

    if (error) throw error;

    return NextResponse.json(config);

  } catch (error) {
    console.error('Get SFW personality error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST/PUT - Update SFW personality config
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.persona_name) {
      return NextResponse.json({ error: 'Persona name required' }, { status: 400 });
    }

    if (body.persona_age && (body.persona_age < 18 || body.persona_age > 99)) {
      return NextResponse.json({ error: 'Age must be 18-99' }, { status: 400 });
    }

    // Validate flirt level
    if (body.flirt_level && !['friendly', 'light_flirty', 'romantic'].includes(body.flirt_level)) {
      return NextResponse.json({ error: 'Invalid flirt level' }, { status: 400 });
    }

    // Prepare config for database
    const config: Partial<SFWPersonalityConfig> = {
      creator_id: user.id,
      enabled: body.enabled ?? false,
      persona_name: body.persona_name,
      persona_age: body.persona_age ?? 21,
      backstory: body.backstory || '',
      personality_traits: body.personality_traits || [],
      flirt_level: body.flirt_level || 'light_flirty',
      interests: body.interests || [],
      turn_ons: body.turn_ons || '',
      turn_offs: body.turn_offs || '',
      response_length: body.response_length || 'medium',
      emoji_usage: body.emoji_usage || 'some',
      pricing_model: body.pricing_model || 'included',
      price_per_message: body.price_per_message ?? 0.25,
      physical_traits: body.physical_traits || {},
    };

    // Upsert config
    const { data, error } = await supabase
      .from('sfw_ai_personalities')
      .upsert({
        ...config,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'creator_id',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);

  } catch (error) {
    console.error('Update SFW personality error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE - Reset SFW config to defaults
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('sfw_ai_personalities')
      .delete()
      .eq('creator_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete SFW personality error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

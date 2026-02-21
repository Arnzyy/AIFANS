// ===========================================
// API ROUTE: /api/creator/models/[id]/voice
// GET - Get voice settings for a personality
// PUT - Update voice settings for a personality
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  getVoiceSettingsWithVoice,
  saveVoiceSettings,
  validateVoiceSettingsInput,
} from '@/lib/voice';
import type { ModelVoiceSettingsInput } from '@/lib/voice';

// ===========================================
// GET - Fetch voice settings
// ===========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personalityId } = await params;
    const supabase = await createServerClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this personality via creator relationship
    const { data: personality, error: personalityError } = await supabase
      .from('ai_personalities')
      .select('id, creator_id')
      .eq('id', personalityId)
      .single();

    if (personalityError || !personality) {
      return NextResponse.json({ error: 'Personality not found' }, { status: 404 });
    }

    // Check ownership - ai_personalities.creator_id stores the user's auth ID
    if (personality.creator_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get voice settings with voice details
    const result = await getVoiceSettingsWithVoice(supabase, personalityId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[VoiceSettings GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice settings' },
      { status: 500 }
    );
  }
}

// ===========================================
// PUT - Update voice settings
// ===========================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personalityId } = await params;
    const supabase = await createServerClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this personality
    const { data: personality, error: personalityError } = await supabase
      .from('ai_personalities')
      .select('id, creator_id')
      .eq('id', personalityId)
      .single();

    if (personalityError || !personality) {
      return NextResponse.json({ error: 'Personality not found' }, { status: 404 });
    }

    // Check ownership - ai_personalities.creator_id stores the user's auth ID
    if (personality.creator_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get creator record for voice settings FK
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const input: ModelVoiceSettingsInput = {
      voice_id: body.voice_id,
      custom_voice_id: body.custom_voice_id,
      stability: body.stability,
      similarity_boost: body.similarity_boost,
      style_exaggeration: body.style_exaggeration,
      speed: body.speed,
      voice_enabled: body.voice_enabled,
      realtime_enabled: body.realtime_enabled,
      realtime_voice_id: body.realtime_voice_id,
      realtime_stability: body.realtime_stability,
      realtime_similarity: body.realtime_similarity,
      realtime_speed: body.realtime_speed,
    };

    // Remove undefined values
    Object.keys(input).forEach(key => {
      if (input[key as keyof ModelVoiceSettingsInput] === undefined) {
        delete input[key as keyof ModelVoiceSettingsInput];
      }
    });

    // Validate input
    const validationErrors = validateVoiceSettingsInput(input);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Save settings
    const settings = await saveVoiceSettings(
      supabase,
      creator.id,
      personalityId,
      input
    );

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[VoiceSettings PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update voice settings' },
      { status: 500 }
    );
  }
}

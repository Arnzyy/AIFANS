// ===========================================
// API ROUTE: /api/voice/realtime/connect
// POST - Create a voice session and get WebSocket URL
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { checkChatAccessOptimized } from '@/lib/chat';
import { getPersonality } from '@/lib/cache/creator-cache';
import { getVoiceSettings, isRealtimeEnabled, getElevenLabsVoiceId } from '@/lib/voice';
import { generateVoiceToken } from '@/lib/voice/realtime/jwt-service';
import { FeatureFlagService } from '@/lib/feature-flags';
import { voiceRateLimit, checkRateLimit } from '@/lib/rate-limit';
import type { ConnectRequest, ConnectResponse, SessionConfig } from '@/lib/voice/realtime/types';

// Feature flag names
const FLAGS = {
  VOICE_REALTIME_ENABLED: 'VOICE_REALTIME_ENABLED',
  VOICE_BARGE_IN_ENABLED: 'VOICE_BARGE_IN_ENABLED',
  VOICE_MAX_SESSION_MINUTES: 'VOICE_MAX_SESSION_MINUTES',
  VOICE_MONTHLY_LIMIT_MINUTES: 'VOICE_MONTHLY_LIMIT_MINUTES',
};

// Default config values
const DEFAULTS = {
  maxSessionMinutes: 30,
  monthlyLimitMinutes: 60,
  silenceTimeoutMs: 30000,
  vadSensitivity: 0.5,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check (5 connects per minute)
    const rateLimitResult = await checkRateLimit(user.id, voiceRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many voice session requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body: ConnectRequest = await request.json();
    const { personalityId, mode } = body;

    if (!personalityId) {
      return NextResponse.json(
        { error: 'personalityId is required' },
        { status: 400 }
      );
    }

    if (!mode || !['call', 'inline'].includes(mode)) {
      return NextResponse.json(
        { error: 'mode must be "call" or "inline"' },
        { status: 400 }
      );
    }

    // Check feature flag
    const flagService = new FeatureFlagService(supabase);
    const voiceEnabled = await flagService.isEnabled(FLAGS.VOICE_REALTIME_ENABLED, user.id);
    if (!voiceEnabled) {
      return NextResponse.json(
        { error: 'Voice calls are not currently available' },
        { status: 403 }
      );
    }

    // Get personality - personalityId might be ai_personalities.id OR creator_models.id
    // First try direct lookup, then try via model_id link
    let personality = null;

    const { data: directPersonality } = await supabase
      .from('ai_personalities')
      .select('id, creator_id, persona_name, is_active')
      .eq('id', personalityId)
      .maybeSingle();

    if (directPersonality) {
      personality = directPersonality;
    } else {
      // Try looking up by model_id (personalityId is actually a creator_models.id)
      const { data: linkedPersonality } = await supabase
        .from('ai_personalities')
        .select('id, creator_id, persona_name, is_active')
        .eq('model_id', personalityId)
        .maybeSingle();

      personality = linkedPersonality;
    }

    if (!personality) {
      return NextResponse.json(
        { error: 'Personality not found' },
        { status: 404 }
      );
    }

    if (!personality.is_active) {
      return NextResponse.json(
        { error: 'This personality is not active' },
        { status: 403 }
      );
    }

    // Get creator info for chat access check
    // personality.creator_id is the user's auth ID, not creators.id
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id, user_id')
      .eq('user_id', personality.creator_id)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Check chat access (subscription required for voice)
    const access = await checkChatAccessOptimized(supabase, user, creator.id);
    if (!access.hasAccess || access.accessType !== 'subscription') {
      return NextResponse.json(
        {
          error: 'Voice calls require a subscription',
          access,
        },
        { status: 403 }
      );
    }

    // Check if realtime is enabled for this personality (use actual personality.id)
    const realtimeEnabled = await isRealtimeEnabled(supabase, personality.id);
    if (!realtimeEnabled) {
      return NextResponse.json(
        { error: 'Voice calls are not enabled for this creator' },
        { status: 403 }
      );
    }

    // Check voice ID is configured
    const voiceId = await getElevenLabsVoiceId(supabase, personality.id);
    if (!voiceId) {
      return NextResponse.json(
        { error: 'Voice is not configured for this creator' },
        { status: 403 }
      );
    }

    // Check usage limits
    const { data: usage } = await supabase
      .rpc('get_or_create_voice_usage', { p_user_id: user.id });

    const usageData = usage?.[0] || { minutes_used: 0, minutes_limit: DEFAULTS.monthlyLimitMinutes };
    if (usageData.minutes_used >= usageData.minutes_limit) {
      return NextResponse.json(
        {
          error: 'Monthly voice minutes exhausted',
          minutesUsed: usageData.minutes_used,
          minutesLimit: usageData.minutes_limit,
        },
        { status: 403 }
      );
    }

    // Check for existing active session (prevent concurrent calls)
    const { data: existingSession } = await supabase
      .from('voice_sessions')
      .select('id')
      .eq('subscriber_id', user.id)
      .is('ended_at', null)
      .single();

    if (existingSession) {
      return NextResponse.json(
        { error: 'You already have an active voice session' },
        { status: 409 }
      );
    }

    // Create session record (use actual personality.id)
    const { data: session, error: sessionError } = await supabase
      .from('voice_sessions')
      .insert({
        subscriber_id: user.id,
        creator_id: creator.id,
        personality_id: personality.id,
        status: 'connecting',
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('[VoiceConnect] Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create voice session' },
        { status: 500 }
      );
    }

    // Generate JWT token (use actual personality.id)
    const token = generateVoiceToken({
      sessionId: session.id,
      userId: user.id,
      creatorId: creator.id,
      personalityId: personality.id,
      mode,
    });

    // Get config from feature flags
    const bargeInEnabled = await flagService.isEnabled(FLAGS.VOICE_BARGE_IN_ENABLED, user.id);

    // Build session config
    const config: SessionConfig = {
      bargeInEnabled,
      maxSessionMinutes: DEFAULTS.maxSessionMinutes,
      silenceTimeoutMs: DEFAULTS.silenceTimeoutMs,
      vadSensitivity: DEFAULTS.vadSensitivity,
    };

    // Get WebSocket URL
    const wsUrl = process.env.NEXT_PUBLIC_VOICE_WS_URL || 'ws://localhost:3001';

    // Update session status
    await supabase
      .from('voice_sessions')
      .update({ status: 'ready' })
      .eq('id', session.id);

    console.log('[VoiceConnect] Session created:', {
      sessionId: session.id,
      userId: user.id,
      personalityId: personality.id,
      mode,
    });

    const response: ConnectResponse = {
      sessionId: session.id,
      wsUrl,
      token,
      config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[VoiceConnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to voice service' },
      { status: 500 }
    );
  }
}

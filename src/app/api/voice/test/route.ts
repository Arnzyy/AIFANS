// ===========================================
// API ROUTE: /api/voice/test
// POST - Generate voice preview audio
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getVoiceById, generateVoicePreview } from '@/lib/voice';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { voice_id, text, provider_voice_id } = body;

    // Must provide either voice_id (our UUID) or provider_voice_id (ElevenLabs ID)
    let elevenLabsVoiceId: string | null = null;

    if (provider_voice_id) {
      // Direct ElevenLabs voice ID
      elevenLabsVoiceId = provider_voice_id;
    } else if (voice_id) {
      // Look up from our voice library
      const voice = await getVoiceById(supabase, voice_id);
      if (!voice) {
        return NextResponse.json({ error: 'Voice not found' }, { status: 404 });
      }
      if (voice.provider !== 'elevenlabs') {
        return NextResponse.json(
          { error: 'Preview only supported for ElevenLabs voices' },
          { status: 400 }
        );
      }
      elevenLabsVoiceId = voice.provider_voice_id;
    } else {
      return NextResponse.json(
        { error: 'Either voice_id or provider_voice_id is required' },
        { status: 400 }
      );
    }

    // Check for placeholder IDs
    if (elevenLabsVoiceId.startsWith('REPLACE_WITH_')) {
      return NextResponse.json(
        { error: 'Voice preview not available - voice ID not configured' },
        { status: 400 }
      );
    }

    // Validate text
    const previewText = text?.trim() || undefined;
    if (previewText && previewText.length > 500) {
      return NextResponse.json(
        { error: 'Preview text must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Generate preview
    const preview = await generateVoicePreview(elevenLabsVoiceId, previewText);

    return NextResponse.json(preview);
  } catch (error) {
    console.error('[VoiceTest API] Error:', error);

    // Check for ElevenLabs API errors
    if (error instanceof Error && error.message.includes('ElevenLabs')) {
      return NextResponse.json(
        { error: 'Voice preview service unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate voice preview' },
      { status: 500 }
    );
  }
}

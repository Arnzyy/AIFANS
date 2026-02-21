// ===========================================
// API ROUTE: /api/voice/library
// GET - List available voices from voice_library
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getAvailableVoices, getAvailableAccents } from '@/lib/voice';
import type { VoiceGender, VoiceAgeRange } from '@/lib/voice';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params for filters
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get('gender') as VoiceGender | null;
    const ageRange = searchParams.get('age_range') as VoiceAgeRange | null;
    const accent = searchParams.get('accent');
    const isPremium = searchParams.get('is_premium');
    const includeAccents = searchParams.get('include_accents') === 'true';

    // Build filters
    const filters: Record<string, unknown> = {};
    if (gender) filters.gender = gender;
    if (ageRange) filters.age_range = ageRange;
    if (accent) filters.accent = accent;
    if (isPremium !== null) filters.is_premium = isPremium === 'true';

    // Fetch voices
    const voices = await getAvailableVoices(
      supabase,
      Object.keys(filters).length > 0 ? filters as any : undefined
    );

    // Optionally include available accents for filter dropdown
    let accents: string[] = [];
    if (includeAccents) {
      accents = await getAvailableAccents(supabase);
    }

    return NextResponse.json({
      voices,
      ...(includeAccents && { accents }),
      count: voices.length,
    });
  } catch (error) {
    console.error('[VoiceLibrary API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voice library' },
      { status: 500 }
    );
  }
}

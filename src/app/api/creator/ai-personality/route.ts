import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AIPersonalityFull } from '@/lib/ai/personality/types';
import { encryptField, decryptField } from '@/lib/encryption';

// GET /api/creator/ai-personality - Get creator's AI personalities
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Return all personalities for this creator
  const { data: personalities, error } = await adminSupabase
    .from('ai_personalities')
    .select('*')
    .eq('creator_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Decrypt sensitive fields if they were encrypted
  const decryptedPersonalities = (personalities || []).map((p: any) => {
    const decrypted = { ...p };

    if (p.flirting_style_encrypted && p.flirting_style) {
      try {
        decrypted.flirting_style = decryptField(p.flirting_style);
      } catch (e) {
        console.error('Failed to decrypt flirting_style:', e);
      }
    }

    if (p.turn_ons_encrypted && p.turn_ons) {
      try {
        decrypted.turn_ons = decryptField(p.turn_ons);
      } catch (e) {
        console.error('Failed to decrypt turn_ons:', e);
      }
    }

    if (p.speech_patterns_encrypted && p.speech_patterns) {
      try {
        decrypted.speech_patterns = decryptField(p.speech_patterns);
      } catch (e) {
        console.error('Failed to decrypt speech_patterns:', e);
      }
    }

    return decrypted;
  });

  return NextResponse.json({ personalities: decryptedPersonalities });
}

// POST /api/creator/ai-personality - Create or update AI personality (upsert)
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use admin client to bypass RLS for database operations
  const adminSupabase = createAdminClient();

  // Debug: Check if service role is configured
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set!');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Verify creator role
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'creator') {
    return NextResponse.json({ error: 'Only creators can create AI personalities' }, { status: 403 });
  }

  const body: AIPersonalityFull = await request.json();

  // Validate required fields
  if (!body.persona_name || body.persona_name.trim() === '') {
    return NextResponse.json({ error: 'Persona name is required' }, { status: 400 });
  }

  if (!body.personality_traits || body.personality_traits.length === 0) {
    return NextResponse.json({ error: 'At least one personality trait is required' }, { status: 400 });
  }

  // Encrypt sensitive fields
  const encryptedFlirtingStyle = body.flirting_style ? encryptField(body.flirting_style) : null;
  const encryptedTurnOns = body.turn_ons ? encryptField(body.turn_ons) : null;
  const encryptedSpeechPatterns = body.speech_patterns ? encryptField(body.speech_patterns) : null;

  const personalityData = {
    creator_id: user.id,
    model_id: body.model_id || null,
    persona_name: body.persona_name,
    age: body.age,
    height_cm: body.height_cm,
    body_type: body.body_type,
    hair_color: body.hair_color,
    hair_style: body.hair_style,
    eye_color: body.eye_color,
    skin_tone: body.skin_tone,
    style_vibes: body.style_vibes,
    distinguishing_features: body.distinguishing_features,
    personality_traits: body.personality_traits,
    energy_level: body.energy_level,
    humor_style: body.humor_style,
    intelligence_vibe: body.intelligence_vibe,
    mood: body.mood,
    backstory: body.backstory,
    occupation: body.occupation,
    interests: body.interests,
    music_taste: body.music_taste,
    guilty_pleasures: body.guilty_pleasures,
    flirting_style: encryptedFlirtingStyle,
    flirting_style_encrypted: !!encryptedFlirtingStyle,
    dynamic: body.dynamic,
    attracted_to: body.attracted_to,
    love_language: body.love_language,
    pace: body.pace,
    vibe_creates: body.vibe_creates,
    turn_ons: encryptedTurnOns,
    turn_ons_encrypted: !!encryptedTurnOns,
    vocabulary_level: body.vocabulary_level,
    emoji_usage: body.emoji_usage,
    response_length: body.response_length,
    speech_patterns: encryptedSpeechPatterns,
    speech_patterns_encrypted: !!encryptedSpeechPatterns,
    accent_flavor: body.accent_flavor,
    signature_phrases: body.signature_phrases,
    topics_loves: body.topics_loves,
    topics_avoids: body.topics_avoids,
    when_complimented: body.when_complimented,
    when_heated: body.when_heated,
    pet_peeves: body.pet_peeves,
    is_active: body.is_active ?? true,
  };

  // Check for existing personality for this creator (and model if specified)
  let existingQuery = adminSupabase
    .from('ai_personalities')
    .select('id')
    .eq('creator_id', user.id);

  // If model_id is provided, check for that specific model's personality
  if (body.model_id) {
    existingQuery = existingQuery.eq('model_id', body.model_id);
  } else {
    existingQuery = existingQuery.is('model_id', null);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  let personality;
  let error;

  if (existing) {
    // Update existing personality
    const result = await adminSupabase
      .from('ai_personalities')
      .update({
        ...personalityData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    personality = result.data;
    error = result.error;
  } else {
    // Insert new personality
    const result = await adminSupabase
      .from('ai_personalities')
      .insert(personalityData)
      .select()
      .single();

    personality = result.data;
    error = result.error;
  }

  if (error) {
    console.error('PERSONALITY SAVE ERROR:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      full: error
    });
    return NextResponse.json({
      error: error.message || 'Unknown database error',
      details: error.details || null,
      hint: error.hint || null,
      code: error.code || null,
      debug: JSON.stringify(error)
    }, { status: 500 });
  }

  return NextResponse.json(personality, { status: existing ? 200 : 201 });
}

// PUT /api/creator/ai-personality - Update AI personality
export async function PUT(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  const body: AIPersonalityFull = await request.json();

  // Validate required fields
  if (!body.persona_name || body.persona_name.trim() === '') {
    return NextResponse.json({ error: 'Persona name is required' }, { status: 400 });
  }

  if (!body.personality_traits || body.personality_traits.length === 0) {
    return NextResponse.json({ error: 'At least one personality trait is required' }, { status: 400 });
  }

  // Encrypt sensitive fields for update
  const encryptedFlirtingStylePut = body.flirting_style ? encryptField(body.flirting_style) : null;
  const encryptedTurnOnsPut = body.turn_ons ? encryptField(body.turn_ons) : null;
  const encryptedSpeechPatternsPut = body.speech_patterns ? encryptField(body.speech_patterns) : null;

  // Update personality - build query with filters
  let updateQuery = adminSupabase
    .from('ai_personalities')
    .update({
      model_id: body.model_id || null,
      persona_name: body.persona_name,
      age: body.age,
      height_cm: body.height_cm,
      body_type: body.body_type,
      hair_color: body.hair_color,
      hair_style: body.hair_style,
      eye_color: body.eye_color,
      skin_tone: body.skin_tone,
      style_vibes: body.style_vibes,
      distinguishing_features: body.distinguishing_features,
      personality_traits: body.personality_traits,
      energy_level: body.energy_level,
      humor_style: body.humor_style,
      intelligence_vibe: body.intelligence_vibe,
      mood: body.mood,
      backstory: body.backstory,
      occupation: body.occupation,
      interests: body.interests,
      music_taste: body.music_taste,
      guilty_pleasures: body.guilty_pleasures,
      flirting_style: encryptedFlirtingStylePut,
      flirting_style_encrypted: !!encryptedFlirtingStylePut,
      dynamic: body.dynamic,
      attracted_to: body.attracted_to,
      love_language: body.love_language,
      pace: body.pace,
      vibe_creates: body.vibe_creates,
      turn_ons: encryptedTurnOnsPut,
      turn_ons_encrypted: !!encryptedTurnOnsPut,
      vocabulary_level: body.vocabulary_level,
      emoji_usage: body.emoji_usage,
      response_length: body.response_length,
      speech_patterns: encryptedSpeechPatternsPut,
      speech_patterns_encrypted: !!encryptedSpeechPatternsPut,
      accent_flavor: body.accent_flavor,
      signature_phrases: body.signature_phrases,
      topics_loves: body.topics_loves,
      topics_avoids: body.topics_avoids,
      when_complimented: body.when_complimented,
      when_heated: body.when_heated,
      pet_peeves: body.pet_peeves,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('creator_id', user.id);

  // Also filter by model_id to get the specific personality
  if (body.model_id) {
    updateQuery = updateQuery.eq('model_id', body.model_id);
  } else {
    updateQuery = updateQuery.is('model_id', null);
  }

  const { data: personality, error } = await updateQuery.select().single();

  if (error) {
    console.error('Error updating personality:', error);
    return NextResponse.json({
      error: error.message,
      details: error.details,
      code: error.code
    }, { status: 500 });
  }

  return NextResponse.json(personality);
}

// DELETE /api/creator/ai-personality - Delete (deactivate) AI personality
export async function DELETE() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Soft delete by deactivating
  const { error } = await adminSupabase
    .from('ai_personalities')
    .update({ is_active: false })
    .eq('creator_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

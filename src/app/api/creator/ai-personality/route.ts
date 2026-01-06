import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AIPersonalityFull } from '@/lib/ai/personality/types';

// GET /api/creator/ai-personality - Get creator's AI personality
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: personality, error } = await supabase
    .from('ai_personalities')
    .select('*')
    .eq('creator_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(personality || null);
}

// POST /api/creator/ai-personality - Create new AI personality
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify creator role
  const { data: profile } = await supabase
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

  // Check for existing personality
  const { data: existing } = await supabase
    .from('ai_personalities')
    .select('id')
    .eq('creator_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'AI personality already exists. Use PUT to update.' },
      { status: 409 }
    );
  }

  // Insert new personality
  const { data: personality, error } = await supabase
    .from('ai_personalities')
    .insert({
      creator_id: user.id,
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
      flirting_style: body.flirting_style,
      dynamic: body.dynamic,
      attracted_to: body.attracted_to,
      love_language: body.love_language,
      pace: body.pace,
      vibe_creates: body.vibe_creates,
      turn_ons: body.turn_ons,
      vocabulary_level: body.vocabulary_level,
      emoji_usage: body.emoji_usage,
      response_length: body.response_length,
      speech_patterns: body.speech_patterns,
      accent_flavor: body.accent_flavor,
      signature_phrases: body.signature_phrases,
      topics_loves: body.topics_loves,
      topics_avoids: body.topics_avoids,
      when_complimented: body.when_complimented,
      when_heated: body.when_heated,
      pet_peeves: body.pet_peeves,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating personality:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(personality, { status: 201 });
}

// PUT /api/creator/ai-personality - Update AI personality
export async function PUT(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: AIPersonalityFull = await request.json();

  // Validate required fields
  if (!body.persona_name || body.persona_name.trim() === '') {
    return NextResponse.json({ error: 'Persona name is required' }, { status: 400 });
  }

  if (!body.personality_traits || body.personality_traits.length === 0) {
    return NextResponse.json({ error: 'At least one personality trait is required' }, { status: 400 });
  }

  // Update personality
  const { data: personality, error } = await supabase
    .from('ai_personalities')
    .update({
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
      flirting_style: body.flirting_style,
      dynamic: body.dynamic,
      attracted_to: body.attracted_to,
      love_language: body.love_language,
      pace: body.pace,
      vibe_creates: body.vibe_creates,
      turn_ons: body.turn_ons,
      vocabulary_level: body.vocabulary_level,
      emoji_usage: body.emoji_usage,
      response_length: body.response_length,
      speech_patterns: body.speech_patterns,
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
    .eq('creator_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating personality:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  // Soft delete by deactivating
  const { error } = await supabase
    .from('ai_personalities')
    .update({ is_active: false })
    .eq('creator_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

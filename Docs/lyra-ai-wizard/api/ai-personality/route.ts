// ===========================================
// API ROUTE: /api/creator/ai-personality
// Save and retrieve AI personality configuration
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET - Retrieve creator's AI personality
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: personality, error } = await supabase
      .from('ai_personalities')
      .select('*')
      .eq('creator_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return NextResponse.json(personality || null);
  } catch (error) {
    console.error('Error fetching AI personality:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI personality' },
      { status: 500 }
    );
  }
}

// POST - Create new AI personality
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Ensure creator_id matches authenticated user
    const personalityData = {
      ...body,
      creator_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: personality, error } = await supabase
      .from('ai_personalities')
      .insert(personalityData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(personality);
  } catch (error) {
    console.error('Error creating AI personality:', error);
    return NextResponse.json(
      { error: 'Failed to create AI personality' },
      { status: 500 }
    );
  }
}

// PUT - Update existing AI personality
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { data: personality, error } = await supabase
      .from('ai_personalities')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('creator_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(personality);
  } catch (error) {
    console.error('Error updating AI personality:', error);
    return NextResponse.json(
      { error: 'Failed to update AI personality' },
      { status: 500 }
    );
  }
}

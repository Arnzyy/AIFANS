// ===========================================
// API ROUTE: /api/creator/physical-traits/route.ts
// Physical traits management for AI personas
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { validatePhysicalTraits } from '@/lib/ai/personality/physical-traits';

// GET - Get creator's physical traits
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: personality } = await supabase
      .from('ai_personalities')
      .select('physical_traits')
      .eq('creator_id', user.id)
      .single();

    return NextResponse.json({ 
      physical_traits: personality?.physical_traits || {} 
    });

  } catch (error) {
    console.error('Get physical traits error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST/PUT - Update physical traits
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const traits = await request.json();

    // Validate traits
    const validation = validatePhysicalTraits(traits);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Invalid traits',
        details: validation.errors 
      }, { status: 400 });
    }

    // Update personality with physical traits
    const { data, error } = await supabase
      .from('ai_personalities')
      .update({ 
        physical_traits: traits,
        updated_at: new Date().toISOString(),
      })
      .eq('creator_id', user.id)
      .select('physical_traits')
      .single();

    if (error) {
      // If no personality exists, create one with just physical traits
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('ai_personalities')
          .insert({
            creator_id: user.id,
            physical_traits: traits,
            // Defaults for required fields
            persona_name: 'My AI',
            age: 25,
            personality_traits: ['friendly'],
            flirting_style: ['playful'],
            interests: ['chatting'],
            is_active: false,
          })
          .select('physical_traits')
          .single();

        if (insertError) throw insertError;
        return NextResponse.json({ physical_traits: newData.physical_traits });
      }
      throw error;
    }

    return NextResponse.json({ physical_traits: data.physical_traits });

  } catch (error) {
    console.error('Update physical traits error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE - Clear physical traits
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('ai_personalities')
      .update({ 
        physical_traits: {},
        updated_at: new Date().toISOString(),
      })
      .eq('creator_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Clear physical traits error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ===========================================
// API ROUTE: /api/user/memory/route.ts
// User controls for memory (view, clear, export)
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  getUserMemoryForReview, 
  clearUserMemory, 
  exportUserData 
} from '@/lib/ai/memory-system/memory-service';

// GET - View user's stored memory
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Export all data (GDPR)
    if (action === 'export') {
      const exportData = await exportUserData(supabase, user.id);
      return NextResponse.json(exportData);
    }

    // Get memory for review
    const memory = await getUserMemoryForReview(supabase, user.id);
    
    return NextResponse.json({ memory });

  } catch (error) {
    console.error('Get memory error:', error);
    return NextResponse.json(
      { error: 'Failed to get memory' },
      { status: 500 }
    );
  }
}

// DELETE - Clear user's memory
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await clearUserMemory(supabase, user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Memory cleared successfully' 
    });

  } catch (error) {
    console.error('Clear memory error:', error);
    return NextResponse.json(
      { error: 'Failed to clear memory' },
      { status: 500 }
    );
  }
}

// PATCH - Update memory settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memory_enabled, consent_given } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    
    if (typeof memory_enabled === 'boolean') {
      updates.memory_enabled = memory_enabled;
    }
    
    if (consent_given === true) {
      updates.consent_given = true;
      updates.consent_timestamp = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('memory_settings')
      .upsert({
        user_id: user.id,
        ...updates,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ settings: data });

  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

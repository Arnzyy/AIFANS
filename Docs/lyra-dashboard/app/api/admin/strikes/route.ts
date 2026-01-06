// API Route: /api/admin/strikes
// Get and create strikes

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('creator_strikes')
      .select(`
        *,
        creators (
          id,
          legal_name,
          business_name,
          contact_email
        ),
        creator_models (
          id,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: strikes, error } = await query.limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      strikes: strikes?.map(s => ({
        ...s,
        creator: s.creators,
        model: s.creator_models,
      })) || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['SUPER_ADMIN', 'ADMIN'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { creator_id, model_id, severity, reason } = await request.json();

    if (!creator_id || !severity || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create strike
    const { data: strike, error: strikeError } = await supabase
      .from('creator_strikes')
      .insert({
        creator_id,
        model_id,
        severity,
        reason,
        issued_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (strikeError) {
      throw strikeError;
    }

    // If BAN severity, suspend the creator
    if (severity === 'BAN') {
      await supabase
        .from('creators')
        .update({ status: 'SUSPENDED' })
        .eq('id', creator_id);
    }

    // Log action
    await supabase.from('audit_log').insert({
      action: 'STRIKE_ISSUED',
      entity_type: 'CREATOR',
      entity_id: creator_id,
      actor_id: user.id,
      details: { severity, reason, strike_id: strike.id },
    });

    return NextResponse.json({ strike });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

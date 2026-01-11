// API Route: /api/admin/moderation/queue
// Get pending moderation items

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
    const status = searchParams.get('status') || 'pending_review';
    const targetType = searchParams.get('target_type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('content_moderation_scans')
      .select(`
        *,
        creator_models (
          id,
          display_name,
          avatar_url
        ),
        creators (
          id,
          legal_name,
          business_name,
          contact_email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: true });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: scans, count, error } = await query;

    if (error) {
      throw error;
    }

    // Get anchors for each model
    const modelIds = [...new Set(scans?.filter(s => s.model_id).map(s => s.model_id))];
    
    const { data: anchors } = await supabase
      .from('model_anchors')
      .select('*')
      .in('model_id', modelIds)
      .eq('is_active', true);

    // Map anchors to scans
    const scansWithAnchors = scans?.map(scan => ({
      ...scan,
      model: scan.creator_models,
      creator: scan.creators,
      anchors: anchors?.filter(a => a.model_id === scan.model_id) || [],
    }));

    return NextResponse.json({
      items: scansWithAnchors || [],
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      page,
    });
  } catch (error: any) {
    console.error('Moderation queue error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

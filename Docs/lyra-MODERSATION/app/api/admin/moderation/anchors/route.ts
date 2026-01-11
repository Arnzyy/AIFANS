// API Route: /api/admin/moderation/anchors
// Manage model anchor images

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getModelAnchors, addModelAnchor, removeModelAnchor } from '@/lib/moderation';

// GET anchors for a model
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
    const modelId = searchParams.get('model_id');

    if (!modelId) {
      return NextResponse.json({ error: 'model_id required' }, { status: 400 });
    }

    const anchors = await getModelAnchors(modelId);
    return NextResponse.json({ anchors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST add new anchor
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

    const { model_id, r2_key, r2_url, note } = await request.json();

    if (!model_id || !r2_key || !r2_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const anchor = await addModelAnchor(model_id, r2_key, r2_url, user.id, note);
    return NextResponse.json({ anchor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE remove anchor
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const anchorId = searchParams.get('anchor_id');

    if (!anchorId) {
      return NextResponse.json({ error: 'anchor_id required' }, { status: 400 });
    }

    await removeModelAnchor(anchorId, user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

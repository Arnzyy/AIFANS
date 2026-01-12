// ===========================================
// API ROUTE: /api/admin/moderation/[id]/review
// Submit admin review decision
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: scanId } = await params;
    const supabase = await createServerClient();

    // Admin auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !isAdminUser(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notes, addAsAnchor } = body;

    if (!action || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get current scan
    const { data: scan, error: scanError } = await supabase
      .from('content_moderation_scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (scanError || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const previousStatus = scan.status;

    // Update scan record
    const { error: updateError } = await supabase
      .from('content_moderation_scans')
      .update({
        status: action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
        review_action: action,
      })
      .eq('id', scanId);

    if (updateError) {
      console.error('Review update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update content_items moderation_status if target_id exists
    if (scan.target_id) {
      await supabase
        .from('content_items')
        .update({
          moderation_status: action,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scan.target_id);
    }

    // Add as anchor if requested and approved
    if (addAsAnchor && action === 'approved' && scan.model_id && scan.r2_url) {
      const { error: anchorError } = await supabase
        .from('model_anchors')
        .insert({
          model_id: scan.model_id,
          r2_key: scan.r2_key,
          r2_url: scan.r2_url,
          created_by: user.id,
          note: 'Added during review approval',
        });

      if (anchorError) {
        console.error('Failed to add anchor:', anchorError);
      }
    }

    // Log audit entry
    await supabase.from('moderation_audit_log').insert({
      scan_id: scanId,
      model_id: scan.model_id,
      creator_id: scan.creator_id,
      actor_id: user.id,
      actor_type: 'admin',
      action: `review_${action}`,
      previous_status: previousStatus,
      new_status: action,
      details: { notes, added_as_anchor: addAsAnchor },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Review error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

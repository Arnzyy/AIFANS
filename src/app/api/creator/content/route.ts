// ===========================================
// API ROUTE: /api/creator/content/route.ts
// Content upload and management with moderation
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { queueUploadForModeration } from '@/lib/moderation/integration';

// POST - Upload/register new content
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator record
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const body = await request.json();
    const { type, url, thumbnail_url, title, description, visibility, is_nsfw, model_id, r2_key } = body;

    if (!url || !type) {
      return NextResponse.json(
        { error: 'url and type required' },
        { status: 400 }
      );
    }

    if (!['image', 'video', 'audio'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be image, video, or audio' },
        { status: 400 }
      );
    }

    // Insert content item with pending moderation status
    const { data: content, error } = await supabase
      .from('content_items')
      .insert({
        creator_id: creator.id,
        model_id: model_id || null,
        type,
        url,
        thumbnail_url,
        title,
        description,
        visibility: visibility || 'subscribers',
        is_nsfw: is_nsfw || false,
        moderation_status: 'pending_scan', // Content hidden until approved
      })
      .select()
      .single();

    if (error) {
      console.error('Content insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Queue for moderation scan (images/videos only)
    let scanId: string | null = null;
    if (content && (type === 'image' || type === 'video')) {
      try {
        scanId = await queueUploadForModeration({
          targetType: 'model_gallery',
          targetId: content.id,
          modelId: model_id || undefined,
          creatorId: creator.id,
          r2Key: r2_key || url, // Use r2_key if provided, otherwise URL
          r2Url: url,
          priority: 5,
        });

        // Link scan to content item
        if (scanId) {
          await supabase
            .from('content_items')
            .update({ moderation_scan_id: scanId })
            .eq('id', content.id);
        }

        console.log('[Content Upload] Queued moderation scan:', scanId);
      } catch (moderationError) {
        // Log but don't fail - content is still pending
        console.error('[Content Upload] Moderation queue error:', moderationError);
      }
    }

    return NextResponse.json({
      item: content,
      moderation: {
        status: 'pending_scan',
        scanId,
        message: 'Content is being reviewed and will be visible once approved.',
      },
    });
  } catch (error) {
    console.error('Content upload error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// GET - Get all creator's content
export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator record
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creator) {
      return NextResponse.json({ items: [] });
    }

    // Get content items
    const { data: items, error } = await supabase
      .from('content_items')
      .select(`
        *,
        model:creator_models(id, name)
      `)
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Content fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (error) {
    console.error('Get content error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH - Update content metadata
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_id, title, description, visibility, is_nsfw } = await request.json();

    if (!content_id) {
      return NextResponse.json({ error: 'content_id required' }, { status: 400 });
    }

    // Get creator
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Verify ownership and update
    const { data: content, error } = await supabase
      .from('content_items')
      .update({
        title,
        description,
        visibility,
        is_nsfw,
        updated_at: new Date().toISOString(),
      })
      .eq('id', content_id)
      .eq('creator_id', creator.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: content });
  } catch (error) {
    console.error('Update content error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE - Delete content item
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('id');

    if (!contentId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Get creator
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', contentId)
      .eq('creator_id', creator.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete content error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

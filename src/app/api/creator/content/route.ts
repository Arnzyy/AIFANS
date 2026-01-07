// ===========================================
// API ROUTE: /api/creator/content/route.ts
// Content upload and management
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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
    const { type, url, thumbnail_url, title, description, visibility, is_nsfw, model_id } = body;

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

    // Insert content item
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
      })
      .select()
      .single();

    if (error) {
      console.error('Content insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: content });
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

// PATCH - Re-analyze content
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_id } = await request.json();

    if (!content_id) {
      return NextResponse.json({ error: 'content_id required' }, { status: 400 });
    }

    // Verify ownership
    const { data: content } = await supabase
      .from('content_metadata')
      .select('creator_id')
      .eq('id', content_id)
      .single();

    if (!content || content.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Not found or not authorized' },
        { status: 404 }
      );
    }

    const success = await reanalyzeContent(supabase, content_id);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Reanalyze error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE - Delete content metadata
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

    const { error } = await supabase
      .from('content_metadata')
      .delete()
      .eq('id', contentId)
      .eq('creator_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete content error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

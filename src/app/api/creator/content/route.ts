// ===========================================
// API ROUTE: /api/creator/content/route.ts
// Content upload with AI analysis
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  saveContentMetadata,
  getCreatorContent,
  reanalyzeContent,
} from '@/lib/ai/content-awareness/content-service';

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

    const { file_url, content_type, is_ppv, price } = await request.json();

    if (!file_url || !content_type) {
      return NextResponse.json(
        { error: 'file_url and content_type required' },
        { status: 400 }
      );
    }

    if (!['image', 'video'].includes(content_type)) {
      return NextResponse.json(
        { error: 'content_type must be image or video' },
        { status: 400 }
      );
    }

    // Save and analyze content
    const metadata = await saveContentMetadata(
      supabase,
      user.id,
      file_url,
      content_type,
      is_ppv || false,
      price
    );

    if (!metadata) {
      return NextResponse.json(
        { error: 'Failed to save content' },
        { status: 500 }
      );
    }

    return NextResponse.json({ content: metadata });
  } catch (error) {
    console.error('Content upload error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// GET - Get all creator's content metadata
export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const content = await getCreatorContent(supabase, user.id);

    return NextResponse.json({ content });
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

// ===========================================
// API ROUTE: /api/creator/content/[id]
// Delete specific content item
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// DELETE - Delete content item by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID required' }, { status: 400 });
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

    // Get the content item first to get the file URL for storage deletion
    const { data: contentItem } = await supabase
      .from('content_items')
      .select('url, thumbnail_url')
      .eq('id', contentId)
      .eq('creator_id', creator.id)
      .single();

    if (!contentItem) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Delete from database
    const { error } = await supabase
      .from('content_items')
      .delete()
      .eq('id', contentId)
      .eq('creator_id', creator.id);

    if (error) {
      console.error('Delete content error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optionally delete from storage (extract path from URL)
    // The URL format is typically: https://xxx.supabase.co/storage/v1/object/public/bucket/path
    try {
      if (contentItem.url) {
        const urlParts = contentItem.url.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          const pathWithBucket = urlParts[1];
          const [bucket, ...pathParts] = pathWithBucket.split('/');
          const filePath = pathParts.join('/');
          if (bucket && filePath) {
            await supabase.storage.from(bucket).remove([filePath]);
          }
        }
      }
    } catch (storageError) {
      // Log but don't fail the request if storage deletion fails
      console.error('Storage deletion error:', storageError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete content error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// GET - Get specific content item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params;
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { data: item, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('id', contentId)
      .eq('creator_id', creator.id)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Get content error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

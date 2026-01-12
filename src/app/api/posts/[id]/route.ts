import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/posts/[id] - Get single post
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get post and verify ownership
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('creator_id', user.id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PATCH /api/posts/[id] - Update post
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify ownership
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id, creator_id, is_published')
      .eq('id', id)
      .eq('creator_id', user.id)
      .single();

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const body = await request.json();
    const { textContent, mediaUrls, isPpv, ppvPrice, isPublished, scheduledAt } = body;

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (textContent !== undefined) updates.text_content = textContent;
    if (mediaUrls !== undefined) updates.media_urls = mediaUrls;
    if (isPpv !== undefined) updates.is_ppv = isPpv;
    if (ppvPrice !== undefined) updates.ppv_price = isPpv ? ppvPrice : null;
    if (isPublished !== undefined) updates.is_published = isPublished;
    if (scheduledAt !== undefined) updates.scheduled_at = scheduledAt;

    // Update post
    const { data: post, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle post count changes
    if (isPublished !== undefined && isPublished !== existingPost.is_published) {
      if (isPublished) {
        await supabase.rpc('increment_post_count', { p_creator_id: user.id });
      } else {
        await supabase.rpc('decrement_post_count', { p_creator_id: user.id });
      }
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/posts/[id] - Delete post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify ownership
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id, creator_id, is_published')
      .eq('id', id)
      .eq('creator_id', user.id)
      .single();

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Decrement post count if was published
    if (existingPost.is_published) {
      await supabase.rpc('decrement_post_count', { p_creator_id: user.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

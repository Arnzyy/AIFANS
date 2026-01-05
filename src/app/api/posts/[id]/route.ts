import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      creator:profiles!posts_creator_id_fkey(
        id, username, display_name, avatar_url
      ),
      media:post_media(*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Check if user has purchased PPV
  if (post.is_ppv && user) {
    const { data: purchase } = await supabase
      .from('post_purchases')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .single();

    (post as any).is_purchased = !!purchase;
  }

  // Check if user has liked
  if (user) {
    const { data: like } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .single();

    (post as any).is_liked = !!like;
  }

  return NextResponse.json({ post });
}

// DELETE /api/posts/[id] - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check ownership
  const { data: post } = await supabase
    .from('posts')
    .select('creator_id')
    .eq('id', params.id)
    .single();

  if (!post || post.creator_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/posts/[id] - Update post
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check ownership
  const { data: existingPost } = await supabase
    .from('posts')
    .select('creator_id')
    .eq('id', params.id)
    .single();

  if (!existingPost || existingPost.creator_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const body = await request.json();
  const { text_content, is_ppv, ppv_price, is_published } = body;

  const { data: post, error } = await supabase
    .from('posts')
    .update({
      text_content,
      is_ppv,
      ppv_price: is_ppv ? ppv_price : null,
      is_published,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post });
}

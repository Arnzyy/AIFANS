import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/content/[id]/like - Check if user has liked this content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ liked: false, likeCount: 0 });
  }

  // Check if user liked this content
  const { data: existingLike } = await supabase
    .from('content_likes')
    .select('id')
    .eq('content_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  // Get total like count
  const { count } = await supabase
    .from('content_likes')
    .select('*', { count: 'exact', head: true })
    .eq('content_id', id);

  return NextResponse.json({
    liked: !!existingLike,
    likeCount: count || 0,
  });
}

// POST /api/content/[id]/like - Like content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('content_likes')
    .select('id')
    .eq('content_id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingLike) {
    return NextResponse.json({ error: 'Already liked' }, { status: 400 });
  }

  // Add like
  const { error } = await supabase
    .from('content_likes')
    .insert({
      content_id: id,
      user_id: user.id,
    });

  if (error) {
    console.error('Like error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update like count on content_items
  await supabase.rpc('increment_content_likes', { content_id: id }).catch(() => {
    // RPC may not exist yet, that's OK
  });

  // Get new count
  const { count } = await supabase
    .from('content_likes')
    .select('*', { count: 'exact', head: true })
    .eq('content_id', id);

  return NextResponse.json({ liked: true, likeCount: count || 0 });
}

// DELETE /api/content/[id]/like - Unlike content
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('content_likes')
    .delete()
    .eq('content_id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Unlike error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update like count on content_items
  await supabase.rpc('decrement_content_likes', { content_id: id }).catch(() => {
    // RPC may not exist yet, that's OK
  });

  // Get new count
  const { count } = await supabase
    .from('content_likes')
    .select('*', { count: 'exact', head: true })
    .eq('content_id', id);

  return NextResponse.json({ liked: false, likeCount: count || 0 });
}

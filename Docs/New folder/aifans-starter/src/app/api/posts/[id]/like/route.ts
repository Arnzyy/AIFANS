import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/posts/[id]/like - Like a post
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (existingLike) {
    return NextResponse.json({ error: 'Already liked' }, { status: 400 });
  }

  // Add like
  const { error } = await supabase
    .from('post_likes')
    .insert({
      post_id: params.id,
      user_id: user.id,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Increment like count
  await supabase.rpc('increment_likes', { post_id: params.id });

  return NextResponse.json({ liked: true });
}

// DELETE /api/posts/[id]/like - Unlike a post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Decrement like count
  await supabase.rpc('decrement_likes', { post_id: params.id });

  return NextResponse.json({ liked: false });
}

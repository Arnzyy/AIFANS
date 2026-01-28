import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/content/[id]/comments - Get comments for content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerClient();

  // Get comments with user info
  const { data: comments, error } = await supabase
    .from('content_comments')
    .select(`
      id,
      content,
      created_at,
      user:profiles!user_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('content_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json({ comments: [] });
  }

  // Transform to cleaner format
  const formattedComments = (comments || []).map((c: any) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    user: {
      id: c.user?.id,
      username: c.user?.username,
      displayName: c.user?.display_name || c.user?.username,
      avatarUrl: c.user?.avatar_url,
    },
  }));

  return NextResponse.json({ comments: formattedComments });
}

// POST /api/content/[id]/comments - Add a comment
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

  const body = await request.json();
  const { content } = body;

  if (!content || content.trim() === '') {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
  }

  // Insert comment
  const { data: comment, error } = await supabase
    .from('content_comments')
    .insert({
      content_id: id,
      user_id: user.id,
      content: content.trim(),
    })
    .select(`
      id,
      content,
      created_at
    `)
    .single();

  if (error) {
    console.error('Comment insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get user profile for response
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    comment: {
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      user: {
        id: profile?.id,
        username: profile?.username,
        displayName: profile?.display_name || profile?.username,
        avatarUrl: profile?.avatar_url,
      },
    },
  });
}

// DELETE /api/content/[id]/comments - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contentId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('commentId');

  if (!commentId) {
    return NextResponse.json({ error: 'commentId required' }, { status: 400 });
  }

  // Delete comment (only if user owns it)
  const { error } = await supabase
    .from('content_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Comment delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

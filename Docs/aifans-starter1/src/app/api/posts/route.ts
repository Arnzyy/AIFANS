import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/posts - Get posts (feed or creator posts)
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  
  const creatorId = searchParams.get('creator_id');
  const feedType = searchParams.get('feed'); // 'subscribed' or 'explore'
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('posts')
    .select(`
      *,
      creator:profiles!posts_creator_id_fkey(
        id, username, display_name, avatar_url
      )
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by creator
  if (creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  // Filter by subscriptions
  if (feedType === 'subscribed' && user) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('creator_id')
      .eq('subscriber_id', user.id)
      .eq('status', 'active');
    
    const creatorIds = subs?.map(s => s.creator_id) || [];
    if (creatorIds.length > 0) {
      query = query.in('creator_id', creatorIds);
    } else {
      return NextResponse.json({ posts: [], total: 0 });
    }
  }

  const { data: posts, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check which PPV posts user has purchased
  if (user && posts) {
    const ppvPostIds = posts.filter(p => p.is_ppv).map(p => p.id);
    
    if (ppvPostIds.length > 0) {
      const { data: purchases } = await supabase
        .from('post_purchases')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', ppvPostIds);
      
      const purchasedIds = new Set(purchases?.map(p => p.post_id) || []);
      
      posts.forEach(post => {
        (post as any).is_purchased = purchasedIds.has(post.id);
      });
    }
  }

  return NextResponse.json({ posts, total: count });
}

// POST /api/posts - Create new post
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is a creator
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'creator') {
    return NextResponse.json({ error: 'Only creators can post' }, { status: 403 });
  }

  const body = await request.json();
  const { text_content, media_urls, is_ppv, ppv_price, scheduled_at } = body;

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      creator_id: user.id,
      text_content,
      is_ppv: is_ppv || false,
      ppv_price: is_ppv ? ppv_price : null,
      is_published: !scheduled_at,
      scheduled_at: scheduled_at || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add media if provided
  if (media_urls && media_urls.length > 0) {
    const mediaInserts = media_urls.map((url: string, index: number) => ({
      post_id: post.id,
      media_url: url,
      media_type: url.includes('video') ? 'video' : 'image',
      sort_order: index,
    }));

    await supabase.from('post_media').insert(mediaInserts);
  }

  // Update creator post count
  await supabase.rpc('increment_post_count', { creator_id: user.id });

  return NextResponse.json({ post }, { status: 201 });
}

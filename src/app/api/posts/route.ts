import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Get posts (feed or by creator)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const creatorId = searchParams.get('creatorId')
    const type = searchParams.get('type') // 'feed', 'creator', 'purchased'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (type === 'feed' && user) {
      // Get posts from subscribed creators
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('creator_id')
        .eq('subscriber_id', user.id)
        .eq('status', 'active')

      const creatorIds = subscriptions?.map(s => s.creator_id) || []

      if (creatorIds.length === 0) {
        return NextResponse.json({ posts: [], total: 0 })
      }

      const { data: posts, count } = await supabase
        .from('posts')
        .select(`
          *,
          creator:profiles!posts_creator_id_fkey(
            id, username, display_name, avatar_url
          )
        `, { count: 'exact' })
        .in('creator_id', creatorIds)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Check which PPV posts are unlocked
      if (user && posts) {
        const ppvPostIds = posts.filter(p => p.is_ppv).map(p => p.id)

        if (ppvPostIds.length > 0) {
          const { data: purchases } = await supabase
            .from('ppv_purchases')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', ppvPostIds)

          const purchasedIds = new Set(purchases?.map(p => p.post_id) || [])

          posts.forEach(post => {
            if (post.is_ppv) {
              (post as any).is_unlocked = purchasedIds.has(post.id)
            }
          })
        }
      }

      return NextResponse.json({ posts, total: count })
    }

    if (type === 'creator' && creatorId) {
      // Get posts by a specific creator
      const { data: posts, count } = await supabase
        .from('posts')
        .select(`
          *,
          creator:profiles!posts_creator_id_fkey(
            id, username, display_name, avatar_url
          )
        `, { count: 'exact' })
        .eq('creator_id', creatorId)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return NextResponse.json({ posts, total: count })
    }

    if (type === 'purchased' && user) {
      // Get purchased PPV posts
      const { data: purchases } = await supabase
        .from('ppv_purchases')
        .select(`
          post_id,
          posts(
            *,
            creator:profiles!posts_creator_id_fkey(
              id, username, display_name, avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const posts = purchases?.map(p => ({ ...p.posts, is_unlocked: true })) || []
      return NextResponse.json({ posts, total: purchases?.length || 0 })
    }

    if (type === 'mine' && user) {
      // Get creator's own posts (for dashboard)
      const { data: posts, count } = await supabase
        .from('posts')
        .select('*', { count: 'exact' })
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return NextResponse.json({ posts: posts || [], total: count || 0 })
    }

    return NextResponse.json({ posts: [], total: 0 })

  } catch (error: any) {
    console.error('Posts error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// Create a new post
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a creator
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can post' }, { status: 403 })
    }

    const {
      textContent,
      mediaUrls,
      isPpv,
      ppvPrice,
      isPublished,
      scheduledAt
    } = await request.json()

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        creator_id: user.id,
        text_content: textContent,
        media_urls: mediaUrls || [],
        is_ppv: isPpv || false,
        ppv_price: isPpv ? ppvPrice : null,
        is_published: scheduledAt ? false : (isPublished ?? true),
        scheduled_at: scheduledAt || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment post count
    if (post.is_published) {
      await supabase.rpc('increment_post_count', { p_creator_id: user.id })
    }

    return NextResponse.json({ post })

  } catch (error: any) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create post' },
      { status: 500 }
    )
  }
}

// Update a post
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, textContent, mediaUrls, isPpv, ppvPrice, isPublished } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id, creator_id')
      .eq('id', id)
      .eq('creator_id', user.id)
      .single()

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { data: post, error } = await supabase
      .from('posts')
      .update({
        text_content: textContent,
        media_urls: mediaUrls,
        is_ppv: isPpv,
        ppv_price: isPpv ? ppvPrice : null,
        is_published: isPublished,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post })

  } catch (error: any) {
    console.error('Update post error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update post' },
      { status: 500 }
    )
  }
}

// Delete a post
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('id')

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id, creator_id, is_published')
      .eq('id', postId)
      .eq('creator_id', user.id)
      .single()

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Decrement post count if was published
    if (existingPost.is_published) {
      await supabase.rpc('decrement_post_count', { p_creator_id: user.id })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Delete post error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete post' },
      { status: 500 }
    )
  }
}

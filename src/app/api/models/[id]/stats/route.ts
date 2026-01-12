// ===========================================
// API ROUTE: /api/models/[id]/stats
// Get model statistics (subscribers, posts, likes)
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: modelId } = await params;
    const supabase = await createServerClient();

    // Get the model to find its creator
    const { data: model } = await supabase
      .from('creator_models')
      .select('id, creator_id, subscriber_count')
      .eq('id', modelId)
      .single();

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Get the creator to find content
    const { data: creator } = await supabase
      .from('creators')
      .select('id, user_id')
      .eq('id', model.creator_id)
      .single();

    const creatorId = creator?.id || model.creator_id;
    const creatorUserId = creator?.user_id;

    // Count subscribers (subscriptions to this creator's profile)
    let subscriberCount = model.subscriber_count || 0;
    if (creatorUserId) {
      const { count: subCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorUserId)
        .eq('status', 'active');
      if (subCount !== null) {
        subscriberCount = subCount;
      }
    }

    // Count images and videos
    const { data: contentCounts } = await supabase
      .from('content_items')
      .select('type')
      .eq('creator_id', creatorId);

    let imageCount = 0;
    let videoCount = 0;
    if (contentCounts) {
      imageCount = contentCounts.filter(c => c.type === 'image').length;
      videoCount = contentCounts.filter(c => c.type === 'video').length;
    }

    // Count total likes across all content
    const { data: contentIds } = await supabase
      .from('content_items')
      .select('id')
      .eq('creator_id', creatorId);

    let totalLikes = 0;
    if (contentIds && contentIds.length > 0) {
      const ids = contentIds.map(c => c.id);
      const { count: likeCount } = await supabase
        .from('content_likes')
        .select('*', { count: 'exact', head: true })
        .in('content_id', ids);
      if (likeCount !== null) {
        totalLikes = likeCount;
      }
    }

    return NextResponse.json({
      subscriberCount,
      imageCount,
      videoCount,
      totalLikes,
      postCount: imageCount + videoCount,
    });
  } catch (error) {
    console.error('Get model stats error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

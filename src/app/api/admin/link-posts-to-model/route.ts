import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/admin';

// POST /api/admin/link-posts-to-model
// Links all posts from a creator to a specific model
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminUser(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, modelId } = await request.json();

    if (!creatorId || !modelId) {
      return NextResponse.json({ error: 'creatorId and modelId are required' }, { status: 400 });
    }

    // Verify the model belongs to the creator
    const { data: model } = await supabase
      .from('creator_models')
      .select('id, creator_id')
      .eq('id', modelId)
      .single();

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Update all posts from this creator to link to the model
    const { data: updatedPosts, error } = await supabase
      .from('posts')
      .update({ model_id: modelId })
      .eq('creator_id', creatorId)
      .is('model_id', null) // Only update posts that don't already have a model linked
      .select('id');

    if (error) {
      console.error('Error linking posts to model:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedPosts?.length || 0,
      message: `Linked ${updatedPosts?.length || 0} posts to model ${modelId}`,
    });
  } catch (error: any) {
    console.error('Link posts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

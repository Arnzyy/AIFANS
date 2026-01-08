import { createServerClient } from '@/lib/supabase/server';
import { createCreatorService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/creator/models/[id] - Get single model
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const creatorService = createCreatorService(supabase);

    // Get creator
    const creator = await creatorService.getCreator(user.id);
    if (!creator) {
      return NextResponse.json(
        { error: 'Not a creator' },
        { status: 403 }
      );
    }

    // Get model
    const model = await creatorService.getModelById(params.id);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (model.creator_id !== creator.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Get tags
    const tags = await creatorService.getModelTags(params.id);

    return NextResponse.json({
      model,
      tags,
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    );
  }
}

// PUT /api/creator/models/[id] - Update model
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const creatorService = createCreatorService(supabase);

    // Get creator
    const creator = await creatorService.getCreator(user.id);
    if (!creator) {
      return NextResponse.json(
        { error: 'Not a creator' },
        { status: 403 }
      );
    }

    // Get model
    const model = await creatorService.getModelById(params.id);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (model.creator_id !== creator.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Fields that require re-approval if changed on an approved model
    const majorFields = [
      'avatar_url', 'banner_url', 'name', 'bio', 'backstory',
      'personality_traits', 'nsfw_enabled', 'speaking_style'
    ];

    // Check if model was approved and major fields are being changed
    let requiresReapproval = false;
    if (model.status === 'approved') {
      for (const field of majorFields) {
        if (body[field] !== undefined && body[field] !== model[field as keyof typeof model]) {
          requiresReapproval = true;
          break;
        }
      }
    }

    // If major changes on approved model, reset status to pending
    if (requiresReapproval) {
      body.status = 'pending';
      body.approved_at = null;
    }

    // Update model
    const updatedModel = await creatorService.updateModel(params.id, body);

    return NextResponse.json({
      success: true,
      model: updatedModel,
      requiresReapproval,
      message: requiresReapproval
        ? 'Model updated and sent for re-approval due to major changes'
        : 'Model updated successfully',
    });
  } catch (error) {
    console.error('Error updating model:', error);
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}

// DELETE /api/creator/models/[id] - Delete model
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const creatorService = createCreatorService(supabase);

    // Get creator
    const creator = await creatorService.getCreator(user.id);
    if (!creator) {
      return NextResponse.json(
        { error: 'Not a creator' },
        { status: 403 }
      );
    }

    // Get model
    const model = await creatorService.getModelById(params.id);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (model.creator_id !== creator.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Can't delete approved models with subscribers
    if (model.status === 'approved' && model.subscriber_count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete model with active subscribers' },
        { status: 400 }
      );
    }

    // Delete model
    await creatorService.deleteModel(params.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    );
  }
}

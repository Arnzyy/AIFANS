import { createServerClient } from '@/lib/supabase/server';
import { createCreatorService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/creator/models/[id]/submit - Submit model for review
export async function POST(
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

    // Check model is in draft or rejected status
    if (model.status !== 'draft' && model.status !== 'rejected') {
      return NextResponse.json(
        { error: `Cannot submit model in ${model.status} status` },
        { status: 400 }
      );
    }

    // Validate model has required fields
    if (!model.name || !model.age || model.age < 18) {
      return NextResponse.json(
        { error: 'Model must have name and age (18+)' },
        { status: 400 }
      );
    }

    if (!model.nsfw_enabled && !model.sfw_enabled) {
      return NextResponse.json(
        { error: 'Model must have at least one chat mode enabled' },
        { status: 400 }
      );
    }

    // Submit for review
    const updatedModel = await creatorService.submitModelForReview(params.id);

    return NextResponse.json({
      success: true,
      model: updatedModel,
      message: 'Model submitted for review',
    });
  } catch (error) {
    console.error('Error submitting model:', error);
    return NextResponse.json(
      { error: 'Failed to submit model' },
      { status: 500 }
    );
  }
}

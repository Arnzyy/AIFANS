import { createServerClient } from '@/lib/supabase/server';
import { createCreatorService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/creator/models - Get creator's models
export async function GET() {
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

    // Get models
    const models = await creatorService.getModels(creator.id);

    return NextResponse.json({
      models,
      limit: creator.max_models,
      count: models.length,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

// POST /api/creator/models - Create new model
export async function POST(request: NextRequest) {
  try {
    // Debug: Log cookies received
    const cookieHeader = request.headers.get('cookie');
    console.log('[API] /api/creator/models POST - cookies:', cookieHeader ? 'present' : 'missing');
    console.log('[API] Cookie names:', cookieHeader?.split(';').map(c => c.trim().split('=')[0]).join(', '));

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[API] /api/creator/models POST - user:', user?.id, 'authError:', authError?.message);

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', details: authError?.message },
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

    // Check if creator is approved
    if (creator.status !== 'approved') {
      return NextResponse.json(
        { error: 'Creator account not approved' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.age) {
      return NextResponse.json(
        { error: 'Name and age are required' },
        { status: 400 }
      );
    }

    // Validate age
    if (body.age < 18) {
      return NextResponse.json(
        { error: 'Model must be 18 or older' },
        { status: 400 }
      );
    }

    // Create model
    const model = await creatorService.createModel(creator.id, body);

    return NextResponse.json({
      success: true,
      model,
    });
  } catch (error) {
    console.error('Error creating model:', error);
    const message = error instanceof Error ? error.message : 'Failed to create model';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

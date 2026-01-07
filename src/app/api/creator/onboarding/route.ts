import { createServerClient } from '@/lib/supabase/server';
import { createCreatorService } from '@/lib/creators';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/creator/onboarding - Get onboarding status
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
    const status = await creatorService.getOnboardingStatus(user.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding status' },
      { status: 500 }
    );
  }
}

// POST /api/creator/onboarding - Start onboarding (create creator record)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const creatorService = createCreatorService(supabase);

    // Check if already a creator
    const existing = await creatorService.getCreator(user.id);
    if (existing) {
      return NextResponse.json(
        { error: 'Already registered as creator', creator: existing },
        { status: 400 }
      );
    }

    // Create new creator record
    const creator = await creatorService.createCreator(user.id, body);

    return NextResponse.json({
      success: true,
      creator,
    });
  } catch (error) {
    console.error('Error creating creator:', error);
    return NextResponse.json(
      { error: 'Failed to start onboarding' },
      { status: 500 }
    );
  }
}

// PUT /api/creator/onboarding - Update onboarding step
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { step, data } = body;

    if (!step) {
      return NextResponse.json(
        { error: 'Step is required' },
        { status: 400 }
      );
    }

    const creatorService = createCreatorService(supabase);

    // Get creator
    const creator = await creatorService.getCreator(user.id);
    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found. Start onboarding first.' },
        { status: 404 }
      );
    }

    // Handle declarations step specially
    if (step === 'declarations' && data?.declarations) {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
      const userAgent = request.headers.get('user-agent') || '';

      for (const [type, accepted] of Object.entries(data.declarations)) {
        if (accepted) {
          try {
            await creatorService.addDeclaration(
              creator.id,
              type as never,
              ipAddress,
              userAgent
            );
          } catch (e) {
            // Ignore duplicate declaration errors
            console.log('Declaration may already exist:', type);
          }
        }
      }
    }

    // Update step
    const nextStep = getNextStep(step);
    const updatedCreator = await creatorService.updateOnboardingStep(
      creator.id,
      nextStep,
      data || {}
    );

    return NextResponse.json({
      success: true,
      creator: updatedCreator,
      nextStep,
    });
  } catch (error) {
    console.error('Error updating onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding' },
      { status: 500 }
    );
  }
}

function getNextStep(currentStep: string): string {
  const steps = ['account_type', 'identity', 'stripe_connect', 'declarations', 'submit'];
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= steps.length - 1) {
    return 'submit';
  }
  return steps[currentIndex + 1];
}

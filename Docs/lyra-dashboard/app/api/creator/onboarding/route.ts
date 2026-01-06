// ===========================================
// API ROUTE: /api/creator/onboarding
// Creator onboarding endpoints
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CreatorService } from '@/lib/creators/creator-service';

// GET - Get current onboarding status
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorService = new CreatorService(supabase);
    const creator = await creatorService.getOrCreateCreator(user.id);

    return NextResponse.json({ creator });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update onboarding step
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { step, data } = body;

    const creatorService = new CreatorService(supabase);
    let creator;

    switch (step) {
      case 1:
        creator = await creatorService.updateOnboardingStep1(user.id, data);
        break;
      case 2:
        creator = await creatorService.updateOnboardingStep2(user.id, data);
        break;
      case 3:
        // Step 3 is Stripe Connect - handled separately
        return NextResponse.json({ error: 'Use /api/creator/stripe-connect' }, { status: 400 });
      case 4:
        // Get IP and user agent for declaration logging
        const ip = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';
        
        creator = await creatorService.acceptDeclarations(
          user.id,
          data.declarations,
          ip,
          userAgent
        );
        break;
      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }

    return NextResponse.json({ creator });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Submit for review
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorService = new CreatorService(supabase);
    const result = await creatorService.submitForReview(user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

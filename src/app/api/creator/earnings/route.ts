// ===========================================
// API ROUTE: /api/creator/earnings/route.ts
// Creator earnings dashboard data
// ===========================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCreatorDashboardEarnings } from '@/lib/tax/tax-service';

// GET - Get creator's earnings breakdown
export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const earnings = await getCreatorDashboardEarnings(supabase, user.id);

    return NextResponse.json(earnings);
  } catch (error) {
    console.error('Get earnings error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

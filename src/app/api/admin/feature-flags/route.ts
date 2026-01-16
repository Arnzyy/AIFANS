import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { createAdminService } from '@/lib/creators';

export interface FeatureFlag {
  flag_name: string;
  is_enabled: boolean;
  rollout_percentage: number;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

// GET - Fetch all feature flags
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminService = createAdminService(supabase);
    const isAdmin = await adminService.isAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();
    const { data: flags, error } = await adminSupabase
      .from('feature_flags')
      .select('*')
      .order('flag_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ flags: flags || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching feature flags:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Update a feature flag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminService = createAdminService(supabase);
    const isAdmin = await adminService.isAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { flag_name, is_enabled, rollout_percentage, description } = body;

    if (!flag_name) {
      return NextResponse.json({ error: 'Flag name required' }, { status: 400 });
    }

    // Use admin client to bypass RLS for admin operations
    const adminSupabase = createAdminClient();

    // Get existing flag data
    const { data: existing } = await adminSupabase
      .from('feature_flags')
      .select('*')
      .eq('flag_name', flag_name)
      .single();

    const upsertData = {
      flag_name,
      is_enabled: typeof is_enabled === 'boolean' ? is_enabled : existing?.is_enabled ?? false,
      rollout_percentage: typeof rollout_percentage === 'number'
        ? Math.max(0, Math.min(100, rollout_percentage))
        : existing?.rollout_percentage ?? 0,
      description: typeof description === 'string' ? description : existing?.description ?? '',
      updated_at: new Date().toISOString(),
    };

    const { data: flag, error } = await adminSupabase
      .from('feature_flags')
      .upsert(upsertData, { onConflict: 'flag_name' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ flag });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating feature flag:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Create a new feature flag
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminService = createAdminService(supabase);
    const isAdmin = await adminService.isAdmin(user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { flag_name, is_enabled = false, rollout_percentage = 0, description = '' } = body;

    if (!flag_name) {
      return NextResponse.json({ error: 'Flag name required' }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();
    const { data: flag, error } = await adminSupabase
      .from('feature_flags')
      .upsert({
        flag_name,
        is_enabled,
        rollout_percentage: Math.max(0, Math.min(100, rollout_percentage)),
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'flag_name' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ flag });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating feature flag:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

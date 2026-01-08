import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/dev/make-admin - Make current user an admin (DEV ONLY)
export async function POST() {
  // Only allow in development or with specific flag
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user_roles table exists and add admin role
    const { data: existing } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'User is already an admin',
        userId: user.id
      });
    }

    // Insert admin role
    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'admin',
      });

    if (insertError) {
      console.error('Error inserting admin role:', insertError);
      return NextResponse.json({
        error: 'Failed to add admin role',
        details: insertError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User promoted to admin',
      userId: user.id,
      email: user.email,
    });
  } catch (error: any) {
    console.error('Error making admin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Check if current user is admin
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    return NextResponse.json({
      isAdmin: !!data,
      userId: user.id,
      email: user.email,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

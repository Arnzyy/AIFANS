import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/dev/setup-admin - Create a dedicated admin account (DEV ONLY)
export async function POST() {
  // Only allow in development or with specific flag
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_ENDPOINTS) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const ADMIN_EMAIL = 'admin@joinlyra.com';
  const ADMIN_PASSWORD = 'Password123!';

  try {
    const supabase = createAdminClient();

    // Check if admin user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL);

    let userId: string;

    if (existingAdmin) {
      userId = existingAdmin.id;
      console.log('Admin user already exists:', userId);
    } else {
      // Create the admin user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true, // Auto-confirm email
      });

      if (createError) {
        console.error('Error creating admin user:', createError);
        return NextResponse.json({
          error: 'Failed to create admin user',
          details: createError.message
        }, { status: 500 });
      }

      userId = newUser.user.id;
      console.log('Created admin user:', userId);
    }

    // Create profile if doesn't exist
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: ADMIN_EMAIL,
        username: 'admin',
        display_name: 'Admin',
        role: 'admin',
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // Add admin role if doesn't exist
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
        });

      if (roleError) {
        console.error('Error adding admin role:', roleError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Admin account ready',
      credentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
      userId,
    });
  } catch (error: any) {
    console.error('Error setting up admin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API Route: /api/admin/check-access
// Check if user has admin access

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isAdmin: false });
    }

    // Check user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];
    const isAdmin = userRole && adminRoles.includes(userRole.role);

    return NextResponse.json({ 
      isAdmin,
      role: userRole?.role || 'USER'
    });
  } catch (error: any) {
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}

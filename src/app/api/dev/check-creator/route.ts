import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Check creator profile
  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      exists: !!profile,
      role: profile?.role,
      display_name: profile?.display_name,
      username: profile?.username,
    },
    creator_profile: {
      exists: !!creatorProfile,
      data: creatorProfile,
    },
  });
}

export async function POST() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Update profile to creator
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'creator' })
    .eq('id', user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Create creator profile if doesn't exist
  const { error: creatorError } = await supabase
    .from('creator_profiles')
    .upsert({
      user_id: user.id,
      bio: 'Test creator bio',
    }, {
      onConflict: 'user_id',
    });

  if (creatorError) {
    return NextResponse.json({ error: creatorError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Creator account created/updated' });
}

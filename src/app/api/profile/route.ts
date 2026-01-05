import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/profile - Get current user profile
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      creator_profiles(*)
    `)
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}

// PATCH /api/profile - Update current user profile
export async function PATCH(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { display_name, avatar_url, bio, banner_url, social_links, subscription_price } = body;

  // Update main profile
  const profileUpdate: any = { updated_at: new Date().toISOString() };
  if (display_name !== undefined) profileUpdate.display_name = display_name;
  if (avatar_url !== undefined) profileUpdate.avatar_url = avatar_url;

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Update creator profile if applicable
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'creator') {
    const creatorUpdate: any = {};
    if (bio !== undefined) creatorUpdate.bio = bio;
    if (banner_url !== undefined) creatorUpdate.banner_url = banner_url;
    if (social_links !== undefined) creatorUpdate.social_links = social_links;
    if (subscription_price !== undefined) creatorUpdate.subscription_price = subscription_price;

    if (Object.keys(creatorUpdate).length > 0) {
      await supabase
        .from('creator_profiles')
        .update(creatorUpdate)
        .eq('user_id', user.id);
    }
  }

  // Return updated profile
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('*, creator_profiles(*)')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ profile: updatedProfile });
}

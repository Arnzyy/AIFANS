import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default async function FanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .single();

  // Check if creator
  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('is_verified')
    .eq('user_id', user.id)
    .single();

  const dashboardUser = {
    id: user.id,
    name: profile?.display_name || profile?.username || 'User',
    username: profile?.username || user.id.substring(0, 8),
    isCreator: !!creatorProfile,
    isVerifiedCreator: creatorProfile?.is_verified || false,
  };

  return <DashboardLayout user={dashboardUser}>{children}</DashboardLayout>;
}

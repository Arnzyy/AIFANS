// API Route: /api/admin/dashboard
// Get comprehensive dashboard data for admin panel

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get counts in parallel
    const [
      { count: totalCreators },
      { count: pendingCreators },
      { count: totalModels },
      { count: pendingModels },
      { count: pendingReports },
      { count: activeStrikes },
    ] = await Promise.all([
      supabase.from('creators').select('id', { count: 'exact', head: true }),
      supabase.from('creators').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_REVIEW'),
      supabase.from('creator_models').select('id', { count: 'exact', head: true }),
      supabase.from('creator_models').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_REVIEW'),
      supabase.from('content_reports').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('creator_strikes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    // Get user counts from auth (would need service role key)
    // For now, estimate from other tables
    const { count: totalSubscriptions } = await supabase
      .from('model_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    // Get recent activity from audit log
    const { data: recentActivity } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate financial stats
    const { data: earnings } = await supabase
      .from('creator_earnings')
      .select('gross_amount_gbp, net_amount_gbp, created_at');

    const totalRevenue = earnings?.reduce((sum, e) => sum + e.gross_amount_gbp, 0) || 0;
    
    // Get this month's revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyRevenue = earnings
      ?.filter(e => new Date(e.created_at) >= startOfMonth)
      .reduce((sum, e) => sum + e.gross_amount_gbp, 0) || 0;

    // Pending payouts
    const { data: pendingPayouts } = await supabase
      .from('creator_payouts')
      .select('amount_gbp_minor')
      .eq('status', 'PENDING');

    const pendingPayoutsTotal = pendingPayouts?.reduce((sum, p) => sum + p.amount_gbp_minor, 0) || 0;

    // Growth calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: newUsersToday } = await supabase
      .from('creators')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: newCreatorsThisWeek } = await supabase
      .from('creators')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    return NextResponse.json({
      totalCreators: totalCreators || 0,
      totalModels: totalModels || 0,
      totalUsers: 0, // Would need auth service role
      totalSubscriptions: totalSubscriptions || 0,
      pendingCreators: pendingCreators || 0,
      pendingModels: pendingModels || 0,
      pendingReports: pendingReports || 0,
      activeStrikes: activeStrikes || 0,
      totalRevenue,
      monthlyRevenue,
      pendingPayouts: pendingPayoutsTotal,
      newUsersToday: newUsersToday || 0,
      newCreatorsThisWeek: newCreatorsThisWeek || 0,
      recentActivity: recentActivity?.map(a => ({
        id: a.id,
        type: a.action,
        description: formatActivityDescription(a.action, a.details),
        timestamp: a.created_at,
      })) || [],
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatActivityDescription(action: string, details: any): string {
  const descriptions: Record<string, string> = {
    CREATOR_APPROVED: `Creator "${details?.creator_name || 'Unknown'}" was approved`,
    CREATOR_REJECTED: `Creator "${details?.creator_name || 'Unknown'}" was rejected`,
    MODEL_APPROVED: `Model "${details?.model_name || 'Unknown'}" was approved`,
    MODEL_REJECTED: `Model "${details?.model_name || 'Unknown'}" was rejected`,
    REPORT_RESOLVED: `Content report was resolved`,
    STRIKE_ISSUED: `Strike issued to creator`,
    PAYOUT_PROCESSED: `Payout of £${((details?.amount || 0) / 100).toFixed(2)} processed`,
  };
  
  return descriptions[action] || `Action: ${action}`;
}

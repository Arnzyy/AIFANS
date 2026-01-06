// ===========================================
// API ROUTE: /api/admin/dac7/route.ts
// Admin DAC7 reporting endpoints
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  generateDAC7Report,
  getReportableCreators,
  exportDAC7AsCSV,
  generateDAC7XML,
  saveDAC7Report,
} from '@/lib/tax/tax-service';

// Middleware to check admin status
async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

// GET - Generate DAC7 report preview
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin status
    if (!await isAdmin(supabase, user.id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const taxYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const format = searchParams.get('format') || 'json';
    const reportableOnly = searchParams.get('reportable_only') === 'true';

    // Get report data
    const entries = reportableOnly
      ? await getReportableCreators(supabase, taxYear)
      : await generateDAC7Report(supabase, taxYear);

    // Return in requested format
    if (format === 'csv') {
      const csv = exportDAC7AsCSV(entries, taxYear);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="lyra-dac7-${taxYear}.csv"`,
        },
      });
    }

    if (format === 'xml') {
      const xml = generateDAC7XML(entries, taxYear, {
        name: 'LYRA Platform Ltd',
        tin: process.env.PLATFORM_TIN || 'XXXXXXXXX',
        address: process.env.PLATFORM_ADDRESS || '123 Platform Street, London',
        country: 'GB',
      });
      return new Response(xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="lyra-dac7-${taxYear}.xml"`,
        },
      });
    }

    // JSON summary
    return NextResponse.json({
      tax_year: taxYear,
      generated_at: new Date().toISOString(),
      total_creators: entries.length,
      total_earnings: entries.reduce((sum, e) => sum + e.total_earnings, 0),
      total_platform_fees: entries.reduce((sum, e) => sum + e.platform_fees, 0),
      total_transactions: entries.reduce((sum, e) => sum + e.transaction_count, 0),
      reportable_only: reportableOnly,
      entries: entries,
    });

  } catch (error) {
    console.error('DAC7 report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

// POST - Save/submit DAC7 report
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdmin(supabase, user.id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { tax_year, action, report_id, hmrc_reference } = body;

    if (!tax_year) {
      return NextResponse.json({ error: 'tax_year required' }, { status: 400 });
    }

    // Get reportable entries
    const entries = await getReportableCreators(supabase, tax_year);

    if (action === 'save_draft') {
      // Save as draft
      const reportId = await saveDAC7Report(supabase, {
        tax_year,
        total_creators: entries.length,
        total_earnings: entries.reduce((sum, e) => sum + e.total_earnings, 0),
        total_platform_fees: entries.reduce((sum, e) => sum + e.platform_fees, 0),
      }, user.id);

      if (!reportId) {
        return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        report_id: reportId,
        status: 'draft',
      });
    }

    if (action === 'mark_submitted') {
      // Mark as submitted (actual HMRC submission is manual)
      if (!report_id) {
        return NextResponse.json({ error: 'report_id required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('dac7_reports')
        .update({
          submission_status: 'submitted',
          submitted_at: new Date().toISOString(),
          hmrc_reference: hmrc_reference,
        })
        .eq('id', report_id);

      if (error) {
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
      }

      // Mark all earnings as reported
      await supabase
        .from('creator_earnings')
        .update({
          reported_to_hmrc: true,
          report_id: report_id,
        })
        .eq('tax_year', tax_year)
        .eq('status', 'completed');

      return NextResponse.json({
        success: true,
        status: 'submitted',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('DAC7 submit error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

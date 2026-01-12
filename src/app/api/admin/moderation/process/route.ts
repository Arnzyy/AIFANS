// ===========================================
// API ROUTE: /api/admin/moderation/process
// Process pending moderation jobs
// Can be triggered by cron or manually
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processScanJob } from '@/lib/moderation/moderation-service';

// Use service role key for job processing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (API key or cron secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Allow if valid cron secret or service key
    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      authHeader === `Bearer ${supabaseServiceKey}`;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('moderation_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(5); // Process up to 5 at a time

    if (jobsError) {
      console.error('Failed to fetch jobs:', jobsError);
      return NextResponse.json({ error: jobsError.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs', processed: 0 });
    }

    const results: Array<{ jobId: string; status: string; error?: string }> = [];

    for (const job of jobs) {
      try {
        // Mark as processing
        await supabase
          .from('moderation_jobs')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            attempts: job.attempts + 1,
          })
          .eq('id', job.id);

        // Process the scan
        await processScanJob(job.target_id);

        // Mark as completed
        await supabase
          .from('moderation_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({ jobId: job.id, status: 'completed' });
      } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error);

        // Check if max attempts reached
        const newStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'queued';

        await supabase
          .from('moderation_jobs')
          .update({
            status: newStatus,
            last_error: error.message,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.push({ jobId: job.id, status: newStatus, error: error.message });
      }
    }

    return NextResponse.json({
      message: 'Processing complete',
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Job processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get job queue status
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: stats } = await supabase
      .from('moderation_jobs')
      .select('status')
      .then(({ data }) => {
        const counts = {
          queued: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        };
        data?.forEach((job) => {
          if (job.status in counts) {
            counts[job.status as keyof typeof counts]++;
          }
        });
        return { data: counts };
      });

    // Get pending scans count
    const { count: pendingScans } = await supabase
      .from('content_moderation_scans')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending_scan', 'scanning']);

    // Get pending reviews count
    const { count: pendingReviews } = await supabase
      .from('content_moderation_scans')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review');

    return NextResponse.json({
      jobs: stats,
      pendingScans: pendingScans || 0,
      pendingReviews: pendingReviews || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

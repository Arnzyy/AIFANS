// LYRA Virtual Moderation Staff Member - Job Worker
// This can be called via Vercel Cron, QStash, or Trigger.dev

import { createClient } from '@supabase/supabase-js';
import { processScanJob } from './moderation-service';
import { ModerationJob } from './types';

// Lazy-loaded Supabase admin client to avoid build-time errors
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDb(): any {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
}

const WORKER_ID = `worker-${process.env.VERCEL_REGION || 'local'}-${Date.now()}`;
const MAX_JOBS_PER_RUN = 5;
const JOB_TIMEOUT_MS = 30000; // 30 seconds per job

// ============================================
// Job Queue Processing
// ============================================

export async function processJobQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const job = await claimNextJob();

    if (!job) {
      // No more jobs in queue
      break;
    }

    try {
      await processJobWithTimeout(job);
      await markJobCompleted(job.id, true);
      processed++;
    } catch (error: any) {
      console.error(`Job ${job.id} failed:`, error);
      await markJobCompleted(job.id, false, error.message);
      failed++;
    }
  }

  // Get remaining count
  const { count } = await getDb()
    .from('moderation_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'queued');

  return {
    processed,
    failed,
    remaining: count || 0,
  };
}

async function claimNextJob(): Promise<ModerationJob | null> {
  // Use the database function to atomically claim a job
  const { data, error } = await getDb().rpc('claim_moderation_job', {
    p_worker_id: WORKER_ID,
  });

  if (error) {
    console.error('Error claiming job:', error);
    return null;
  }

  return data as ModerationJob | null;
}

async function processJobWithTimeout(job: ModerationJob): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Job timed out'));
    }, JOB_TIMEOUT_MS);

    try {
      switch (job.target_type) {
        case 'content_upload':
        case 'model_onboarding':
          await processScanJob(job.target_id);
          break;
        case 'bulk_rescan':
          // TODO: Implement bulk rescan
          throw new Error('Bulk rescan not implemented');
        default:
          throw new Error(`Unknown job type: ${job.target_type}`);
      }

      clearTimeout(timeout);
      resolve();
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

async function markJobCompleted(
  jobId: string,
  success: boolean,
  errorMsg?: string
): Promise<void> {
  await getDb().rpc('complete_moderation_job', {
    p_job_id: jobId,
    p_success: success,
    p_error: errorMsg || null,
  });
}

// ============================================
// Stale Job Recovery
// ============================================

export async function recoverStaleJobs(): Promise<number> {
  // Find jobs that have been processing for too long (stuck)
  const staleTimeout = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes

  const { data: staleJobs, error } = await getDb()
    .from('moderation_jobs')
    .update({
      status: 'queued',
      worker_id: null,
      started_at: null,
      last_error: 'Recovered from stale state',
    })
    .eq('status', 'processing')
    .lt('started_at', staleTimeout.toISOString())
    .lt('attempts', 3) // Only retry if under max attempts
    .select();

  if (error) {
    console.error('Error recovering stale jobs:', error);
    return 0;
  }

  return staleJobs?.length || 0;
}

// ============================================
// Queue Management
// ============================================

export async function getQueueStats(): Promise<{
  queued: number;
  processing: number;
  completed_today: number;
  failed_today: number;
  avg_wait_time_ms: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [queuedResult, processingResult, completedResult, failedResult] =
    await Promise.all([
      getDb()
        .from('moderation_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued'),
      getDb()
        .from('moderation_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing'),
      getDb()
        .from('moderation_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', today.toISOString()),
      getDb()
        .from('moderation_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('updated_at', today.toISOString()),
    ]);

  // Calculate average wait time from recent completed jobs
  const { data: recentJobs } = await getDb()
    .from('moderation_jobs')
    .select('created_at, started_at')
    .eq('status', 'completed')
    .not('started_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(100);

  let avgWaitTime = 0;
  if (recentJobs && recentJobs.length > 0) {
    const waitTimes = recentJobs.map(
      (j: { started_at: string; created_at: string }) =>
        new Date(j.started_at).getTime() - new Date(j.created_at).getTime()
    );
    avgWaitTime = Math.round(
      waitTimes.reduce((a: number, b: number) => a + b, 0) / waitTimes.length
    );
  }

  return {
    queued: queuedResult.count || 0,
    processing: processingResult.count || 0,
    completed_today: completedResult.count || 0,
    failed_today: failedResult.count || 0,
    avg_wait_time_ms: avgWaitTime,
  };
}

export async function cancelJob(jobId: string): Promise<void> {
  await getDb()
    .from('moderation_jobs')
    .update({ status: 'cancelled' })
    .eq('id', jobId)
    .in('status', ['queued', 'processing']);
}

export async function retryJob(jobId: string): Promise<void> {
  await getDb()
    .from('moderation_jobs')
    .update({
      status: 'queued',
      attempts: 0,
      last_error: null,
      worker_id: null,
      started_at: null,
    })
    .eq('id', jobId)
    .in('status', ['failed', 'cancelled']);
}

// ============================================
// Priority Queue
// ============================================

export async function prioritizeJob(jobId: string, priority: number): Promise<void> {
  await getDb()
    .from('moderation_jobs')
    .update({ priority: Math.max(1, Math.min(10, priority)) })
    .eq('id', jobId)
    .eq('status', 'queued');
}

// ============================================
// Manual Trigger (for API route)
// ============================================

export async function triggerImmediateScan(scanId: string): Promise<void> {
  // Check if job already exists
  const { data: existingJob } = await getDb()
    .from('moderation_jobs')
    .select('id, status')
    .eq('target_id', scanId)
    .in('status', ['queued', 'processing'])
    .single();

  if (existingJob) {
    // Bump priority if already queued
    if (existingJob.status === 'queued') {
      await prioritizeJob(existingJob.id, 1);
    }
    return;
  }

  // Create high-priority job
  await getDb().from('moderation_jobs').insert({
    target_type: 'content_upload',
    target_id: scanId,
    priority: 1,
  });
}

// API Route: /api/cron/moderation
// Cron job to process moderation queue
// Configure in vercel.json:
// { "crons": [{ "path": "/api/cron/moderation", "schedule": "* * * * *" }] }

import { NextRequest, NextResponse } from 'next/server';
import { processJobQueue, recoverStaleJobs, getQueueStats } from '@/lib/moderation';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get('authorization');
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // First, recover any stale jobs
    const recovered = await recoverStaleJobs();

    // Process jobs in queue
    const result = await processJobQueue();

    // Get updated stats
    const stats = await getQueueStats();

    const duration = Date.now() - startTime;

    console.log('[Moderation Cron]', {
      recovered,
      processed: result.processed,
      failed: result.failed,
      remaining: result.remaining,
      duration_ms: duration,
    });

    return NextResponse.json({
      success: true,
      recovered,
      processed: result.processed,
      failed: result.failed,
      remaining: result.remaining,
      stats,
      duration_ms: duration,
    });
  } catch (error: any) {
    console.error('[Moderation Cron] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime,
    }, { status: 500 });
  }
}

// Also allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

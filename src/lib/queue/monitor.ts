import type { Job } from "bullmq";
import { getGenerationQueue, type GenerationJobData } from "./index";

// Read-only view of the BullMQ queue for the admin dashboard. BullMQ keeps
// completed jobs for 24h (last 100) and failed jobs (last 500), see index.ts.

export type JobStatus = "pending" | "active" | "completed" | "failed";

export interface JobStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
}

export interface JobSummary {
  id: string;
  type: string;
  status: JobStatus;
  videoId: string | null;
  comparisonId: string | null;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// BullMQ state -> dashboard status. "delayed" is a job waiting out retry backoff.
const STATES = {
  waiting: "pending",
  prioritized: "pending",
  delayed: "pending",
  active: "active",
  completed: "completed",
  failed: "failed",
} as const satisfies Record<string, JobStatus>;

type BullState = keyof typeof STATES;

export async function getJobStats(): Promise<JobStats> {
  const counts = await getGenerationQueue().getJobCounts(...(Object.keys(STATES) as BullState[]));
  const stats: JobStats = { pending: 0, active: 0, completed: 0, failed: 0 };
  for (const [state, status] of Object.entries(STATES)) {
    stats[status] += counts[state] ?? 0;
  }
  return stats;
}

/**
 * For pages that should still render when Redis is down. The queue connection
 * retries forever (BullMQ needs maxRetriesPerRequest: null), so bound the wait.
 */
export async function getJobStatsOrNull(timeoutMs = 2000): Promise<JobStats | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    return await Promise.race([getJobStats(), timeout]);
  } catch (error) {
    console.error("[Queue] Failed to read job stats:", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toSummary(job: Job<GenerationJobData>, state: BullState): JobSummary {
  const iso = (ms?: number) => (ms ? new Date(ms).toISOString() : null);
  return {
    id: job.id ?? "",
    type: job.name,
    status: STATES[state],
    videoId: job.data?.videoId ?? null,
    comparisonId: job.data?.comparisonId ?? null,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 1,
    error: job.failedReason || null,
    createdAt: new Date(job.timestamp).toISOString(),
    startedAt: iso(job.processedOn),
    completedAt: iso(job.finishedOn),
  };
}

/** Most recent jobs across all states, newest first. */
export async function getRecentJobs(limit = 50, status?: JobStatus): Promise<JobSummary[]> {
  const queue = getGenerationQueue();
  const states = (Object.keys(STATES) as BullState[]).filter(
    (s) => !status || STATES[s] === status
  );
  const perState = await Promise.all(
    states.map(async (state) => {
      // Each state list is newest first; take `limit` from each, then merge
      const jobs = await queue.getJobs([state], 0, limit - 1, false);
      return jobs.filter(Boolean).map((job) => toSummary(job, state));
    })
  );
  return perState
    .flat()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getWorkerCount(): Promise<number> {
  return (await getGenerationQueue().getWorkers()).length;
}

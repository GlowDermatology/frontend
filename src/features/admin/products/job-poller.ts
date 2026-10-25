import type { ActionResult } from "@/data/types";
import { isJobDone, type Job } from "@/domain/job";

/**
 * Polls a background job until it is `succeeded` or `failed` (contract
 * §2.14): one `fetchJob` every `intervalMs` (1.5 s), never two in flight,
 * stopped by `stop()` (unmount) or after `maxAttempts`. Framework-free so the
 * timing can be unit-tested with fake timers; `useJobPoller` wraps it.
 */

export const JOB_POLL_INTERVAL_MS = 1500;
/** 10 minutes at the default interval, then the poller gives up with a message. */
export const JOB_POLL_MAX_ATTEMPTS = 400;
export const JOB_POLL_TIMEOUT_MESSAGE = "Jarayon javob bermayapti. Sahifani yangilab ko‘ring.";

export interface JobPollerOptions {
  fetchJob: (id: string) => Promise<ActionResult<Job>>;
  /** Every state the poller sees, the starting job included. */
  onUpdate: (job: Job) => void;
  /** A failed poll (network, session, 404) or the attempt limit. The poller stops. */
  onError: (message: string) => void;
  intervalMs?: number;
  maxAttempts?: number;
}

export interface JobPoller {
  /** Reports `job` and keeps polling it while it is queued or running. */
  start: (job: Job) => void;
  stop: () => void;
  readonly active: boolean;
}

export function createJobPoller(options: JobPollerOptions): JobPoller {
  const interval = options.intervalMs ?? JOB_POLL_INTERVAL_MS;
  const maxAttempts = options.maxAttempts ?? JOB_POLL_MAX_ATTEMPTS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let attempts = 0;
  let active = false;

  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const stop = () => {
    generation += 1;
    active = false;
    clear();
  };

  const schedule = (job: Job, current: number) => {
    if (attempts >= maxAttempts) {
      active = false;
      options.onError(JOB_POLL_TIMEOUT_MESSAGE);
      return;
    }
    timer = setTimeout(async () => {
      timer = null;
      attempts += 1;
      const result = await options.fetchJob(job.id);
      if (current !== generation) return; // stopped or restarted while in flight
      if (!result.ok) {
        active = false;
        options.onError(result.error);
        return;
      }
      options.onUpdate(result.data);
      if (isJobDone(result.data.state)) {
        active = false;
        return;
      }
      schedule(result.data, current);
    }, interval);
  };

  return {
    start(job) {
      stop();
      const current = generation;
      attempts = 0;
      options.onUpdate(job);
      if (isJobDone(job.state)) return;
      active = true;
      schedule(job, current);
    },
    stop,
    get active() {
      return active;
    },
  };
}

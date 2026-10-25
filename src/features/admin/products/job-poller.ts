import type { ActionResult } from "@/data/types";
import { isJobDone, type Job } from "@/domain/job";

/**
 * Polls a background job until it is `succeeded` or `failed` (contract
 * §2.14): one `fetchJob` every `intervalMs` (1.5 s), never two in flight,
 * stopped by `stop()` (unmount) or after `maxAttempts`. A transport failure
 * (`network_error` / `timeout`: a sleeping laptop, a proxy hiccup) does not
 * end the tracking of a multi-minute job: the poll is retried with
 * exponential backoff (1.5 → 3 → 6 → 12 s) up to `maxRetries` times in a row
 * before `onError`; any other failure (`not_found`, `session_expired`, a
 * 4xx/5xx envelope) stops at once. Framework-free so the timing can be
 * unit-tested with fake timers; `BillzImport` wraps it.
 */

export const JOB_POLL_INTERVAL_MS = 1500;
/** 10 minutes at the default interval, then the poller gives up with a message. */
export const JOB_POLL_MAX_ATTEMPTS = 400;
/** Consecutive transport failures tolerated before `onError` (1.5 + 3 + 6 + 12 s of backoff). */
export const JOB_POLL_MAX_RETRIES = 4;
export const JOB_POLL_TIMEOUT_MESSAGE = "Jarayon javob bermayapti. Sahifani yangilab ko‘ring.";

/** Failure codes worth retrying: the request never reached the API, or the API never answered. */
const TRANSIENT_CODES: ReadonlySet<string> = new Set(["network_error", "timeout"]);

export interface JobPollerRetry {
  /** 1-based index of the retry about to be scheduled. */
  attempt: number;
  delayMs: number;
  /** The failure that triggered the retry. */
  message: string;
}

export interface JobPollerOptions {
  fetchJob: (id: string) => Promise<ActionResult<Job>>;
  /** Every state the poller sees, the starting job included. */
  onUpdate: (job: Job) => void;
  /** A failed poll (session, 404, exhausted retries) or the attempt limit. The poller stops. */
  onError: (message: string) => void;
  /** A transient failure that will be retried after `delayMs`. The poller keeps going. */
  onRetry?: (retry: JobPollerRetry) => void;
  intervalMs?: number;
  maxAttempts?: number;
  maxRetries?: number;
}

export interface JobPoller {
  /** Reports `job` and keeps polling it while it is queued or running. */
  start: (job: Job) => void;
  stop: () => void;
  readonly active: boolean;
}

/** Backoff for the n-th consecutive retry (1-based): the interval doubled each time. */
export function retryDelayMs(retry: number, intervalMs: number = JOB_POLL_INTERVAL_MS): number {
  return intervalMs * 2 ** Math.max(0, retry - 1);
}

export function isTransientPollFailure(result: ActionResult<Job>): boolean {
  return !result.ok && result.code !== undefined && TRANSIENT_CODES.has(result.code);
}

export function createJobPoller(options: JobPollerOptions): JobPoller {
  const interval = options.intervalMs ?? JOB_POLL_INTERVAL_MS;
  const maxAttempts = options.maxAttempts ?? JOB_POLL_MAX_ATTEMPTS;
  const maxRetries = options.maxRetries ?? JOB_POLL_MAX_RETRIES;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let attempts = 0;
  let retries = 0;
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

  const fail = (message: string) => {
    active = false;
    options.onError(message);
  };

  const schedule = (job: Job, current: number, delay: number) => {
    if (attempts >= maxAttempts) {
      fail(JOB_POLL_TIMEOUT_MESSAGE);
      return;
    }
    timer = setTimeout(async () => {
      timer = null;
      attempts += 1;
      const result = await options.fetchJob(job.id);
      if (current !== generation) return; // stopped or restarted while in flight
      if (!result.ok) {
        if (!isTransientPollFailure(result) || retries >= maxRetries) {
          fail(result.error);
          return;
        }
        retries += 1;
        const delayMs = retryDelayMs(retries, interval);
        options.onRetry?.({ attempt: retries, delayMs, message: result.error });
        schedule(job, current, delayMs);
        return;
      }
      retries = 0;
      options.onUpdate(result.data);
      if (isJobDone(result.data.state)) {
        active = false;
        return;
      }
      schedule(result.data, current, interval);
    }, delay);
  };

  return {
    start(job) {
      stop();
      const current = generation;
      attempts = 0;
      retries = 0;
      options.onUpdate(job);
      if (isJobDone(job.state)) return;
      active = true;
      schedule(job, current, interval);
    },
    stop,
    get active() {
      return active;
    },
  };
}

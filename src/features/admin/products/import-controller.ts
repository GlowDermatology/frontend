import { isJobDone, type Job } from "@/domain/job";

import { createJobPoller, type JobPollerOptions } from "./job-poller";

/**
 * Keeps the Billz import job tracked across the component's visibility.
 * Next keeps a visited route mounted in a hidden Activity: leaving
 * /admin/products runs the effect cleanups (the poller must stop then) but
 * keeps the component's state, so the job shown as queued or running must be
 * polled again when the route is shown — otherwise the button would stay
 * disabled on "Import navbatda…" until a reload. `attach()` / `detach()` are
 * the mount effect and its cleanup; `start(job)` hands over a newly started
 * job. Framework-free so the hide/show cycle can be tested with fake timers.
 */

export interface ImportController {
  /** Tracks `job` (reports it, then polls while it is queued or running and attached). */
  start: (job: Job) => void;
  /** The component is visible: resume polling an unfinished job. */
  attach: () => void;
  /** The component is hidden or unmounted: stop polling, remember the job. */
  detach: () => void;
  readonly job: Job | null;
  readonly polling: boolean;
}

export function createImportController(options: JobPollerOptions): ImportController {
  let job: Job | null = null;
  let attached = false;
  const poller = createJobPoller({
    ...options,
    onUpdate: (next) => {
      job = next;
      options.onUpdate(next);
    },
    onError: (message) => {
      job = null;
      options.onError(message);
    },
  });

  return {
    start(next) {
      job = next;
      if (attached) poller.start(next);
      else options.onUpdate(next);
    },
    attach() {
      attached = true;
      if (job && !isJobDone(job.state) && !poller.active) poller.start(job);
    },
    detach() {
      attached = false;
      poller.stop();
    },
    get job() {
      return job;
    },
    get polling() {
      return poller.active;
    },
  };
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/data/types";
import type { Job } from "@/domain/job";

import { createJobPoller, JOB_POLL_TIMEOUT_MESSAGE } from "./job-poller";

/** The import poller: 1.5 s cadence, one request in flight, stops on done/stop/error. */

function job(state: Job["state"], extra: Partial<Job> = {}): Job {
  return {
    id: "12",
    kind: "billz_import",
    state,
    progress: null,
    result: null,
    error: null,
    createdAt: "2026-10-24T12:03:00+05:00",
    startedAt: null,
    finishedAt: null,
    ...extra,
  };
}

const ok = (value: Job): ActionResult<Job> => ({ ok: true, data: value });

describe("createJobPoller", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reports the starting job, polls every 1.5 s and stops when the job is done", async () => {
    const answers = [
      ok(job("running", { progress: { done: 100, total: 248 } })),
      ok(job("succeeded", { result: { created: 3, updated: 245, unchanged: 0, newFromBillz: 3 } })),
    ];
    const fetchJob = vi.fn(async () => answers.shift()!);
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate, onError });

    poller.start(job("queued"));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0]![0]).toMatchObject({ state: "queued" });
    expect(poller.active).toBe(true);
    expect(fetchJob).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1499);
    expect(fetchJob).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchJob).toHaveBeenCalledTimes(1);
    expect(fetchJob).toHaveBeenCalledWith("12");
    expect(onUpdate.mock.calls[1]![0]).toMatchObject({ state: "running", progress: { done: 100 } });
    expect(poller.active).toBe(true);

    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(2);
    expect(onUpdate.mock.calls[2]![0]).toMatchObject({
      state: "succeeded",
      result: { created: 3 },
    });
    expect(poller.active).toBe(false);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchJob).toHaveBeenCalledTimes(2);
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not poll a job that is already finished", async () => {
    const fetchJob = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate: vi.fn(), onError: vi.fn() });
    poller.start(job("failed", { error: { code: "worker_lost", message: "Uzildi." } }));
    expect(poller.active).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchJob).not.toHaveBeenCalled();
  });

  it("never overlaps requests: the next tick is scheduled after the answer arrives", async () => {
    let resolve: ((value: ActionResult<Job>) => void) | undefined;
    const fetchJob = vi.fn(
      () =>
        new Promise<ActionResult<Job>>((r) => {
          resolve = r;
        }),
    );
    const poller = createJobPoller({ fetchJob, onUpdate: vi.fn(), onError: vi.fn() });
    poller.start(job("running"));
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(6000); // the answer is still pending
    expect(fetchJob).toHaveBeenCalledTimes(1);
    resolve!(ok(job("running")));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it("stops on a failed poll and reports the message", async () => {
    const fetchJob = vi.fn(async (): Promise<ActionResult<Job>> => ({
      ok: false,
      error: "API bilan bog‘lanib bo‘lmadi.",
      code: "network_error",
    }));
    const onError = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate: vi.fn(), onError });
    poller.start(job("running"));
    await vi.advanceTimersByTimeAsync(1500);
    expect(onError).toHaveBeenCalledWith("API bilan bog‘lanib bo‘lmadi.");
    expect(poller.active).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchJob).toHaveBeenCalledTimes(1);
  });

  it("ignores an answer that arrives after stop() (unmount) and gives up after maxAttempts", async () => {
    const fetchJob = vi.fn(async () => ok(job("running")));
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const poller = createJobPoller({ fetchJob, onUpdate, onError, maxAttempts: 2 });
    poller.start(job("running"));
    await vi.advanceTimersByTimeAsync(1500);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1500);
    expect(onUpdate).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledWith(JOB_POLL_TIMEOUT_MESSAGE);
    expect(poller.active).toBe(false);

    const second = createJobPoller({ fetchJob, onUpdate, onError });
    second.start(job("running"));
    second.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchJob).toHaveBeenCalledTimes(2); // nothing after stop()
  });
});

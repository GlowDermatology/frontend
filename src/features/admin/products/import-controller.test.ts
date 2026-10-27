import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/data/types";
import type { Job } from "@/domain/job";

import { createImportController } from "./import-controller";

/**
 * The Billz import control across a hide/show of the route (Next keeps a
 * visited route mounted in a hidden Activity: effects are cleaned up, state is
 * kept). `detach()` is the cleanup, `attach()` the effect running again.
 */

function job(state: Job["state"]): Job {
  return {
    id: "12",
    kind: "billz_import",
    state,
    progress: null,
    result:
      state === "succeeded" ? { created: 3, updated: 0, unchanged: 245, newFromBillz: 3 } : null,
    error: null,
    createdAt: "2026-10-24T12:03:00+05:00",
    startedAt: null,
    finishedAt: null,
  };
}

const ok = (value: Job): ActionResult<Job> => ({ ok: true, data: value });

describe("createImportController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stops polling when hidden and resumes a running job when shown again", async () => {
    const fetchJob = vi.fn(async () => ok(job("running")));
    const onUpdate = vi.fn();
    const controller = createImportController({ fetchJob, onUpdate, onError: vi.fn() });
    controller.attach();
    controller.start(job("queued"));
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(1);

    // Leave the route: no polls while hidden, the job is remembered.
    controller.detach();
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetchJob).toHaveBeenCalledTimes(1);
    expect(controller.job?.state).toBe("running");
    expect(controller.polling).toBe(false);

    // Come back: polling resumes until the job is done, which releases the control.
    fetchJob.mockResolvedValue(ok(job("succeeded")));
    controller.attach();
    expect(controller.polling).toBe(true);
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(2);
    expect(onUpdate.mock.calls.at(-1)![0]).toMatchObject({ state: "succeeded" });
    expect(controller.polling).toBe(false);
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetchJob).toHaveBeenCalledTimes(2);
  });

  it("does not poll a finished job again on show, and forgets the job after a give-up", async () => {
    const fetchJob = vi.fn(async (): Promise<ActionResult<Job>> => ({
      ok: false,
      error: "Jarayon topilmadi.",
      code: "not_found",
    }));
    const onError = vi.fn();
    const controller = createImportController({ fetchJob, onUpdate: vi.fn(), onError });
    controller.attach();
    controller.start(job("running"));
    await vi.advanceTimersByTimeAsync(1500);
    expect(onError).toHaveBeenCalledWith("Jarayon topilmadi.");
    expect(controller.job).toBeNull();
    controller.detach();
    controller.attach();
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetchJob).toHaveBeenCalledTimes(1);

    const done = createImportController({ fetchJob, onUpdate: vi.fn(), onError: vi.fn() });
    done.attach();
    done.start(job("succeeded"));
    done.detach();
    done.attach();
    await vi.advanceTimersByTimeAsync(6000);
    expect(fetchJob).toHaveBeenCalledTimes(1);
  });

  it("starts polling a job handed over while hidden once shown", async () => {
    const fetchJob = vi.fn(async () => ok(job("succeeded")));
    const onUpdate = vi.fn();
    const controller = createImportController({ fetchJob, onUpdate, onError: vi.fn() });
    controller.start(job("queued"));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ state: "queued" }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchJob).not.toHaveBeenCalled();
    controller.attach();
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchJob).toHaveBeenCalledTimes(1);
  });
});

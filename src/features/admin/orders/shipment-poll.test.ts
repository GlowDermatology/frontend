import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/data/types";
import type { Order, Shipment } from "@/domain/order";

import { pollShipment } from "./shipment-poll";

const order = (shipment: Shipment) => ({ id: 10250, shipment }) as unknown as Order;
const pending: Shipment = {
  state: "failed",
  lastAttemptAt: "2026-10-24T10:09:00+05:00",
  pending: true,
};
const created: Shipment = {
  state: "created",
  trackingNumber: "48214250",
  tariff: 27000,
  updatedAt: "2026-10-24T12:01:00+05:00",
  via: "webhook",
};
const sleep = vi.fn(async () => undefined);

describe("pollShipment", () => {
  it("stops at the first answer whose shipment is no longer pending", async () => {
    const answers: ActionResult<Order>[] = [
      { ok: true, data: order(pending) },
      { ok: false, error: "API bilan bog‘lanib bo‘lmadi.", code: "network_error" },
      { ok: true, data: order(created) },
      { ok: true, data: order(pending) },
    ];
    const load = vi.fn(async () => answers.shift()!);
    const onPending = vi.fn();
    const outcome = await pollShipment({
      load,
      signal: new AbortController().signal,
      onPending,
      sleep,
    });
    expect(outcome).toMatchObject({ kind: "settled", order: { shipment: { state: "created" } } });
    expect(load).toHaveBeenCalledTimes(3);
    expect(onPending).toHaveBeenCalledTimes(1);
  });

  it("gives up after the bounded number of reads", async () => {
    const load = vi.fn(async (): Promise<ActionResult<Order>> => ({
      ok: true,
      data: order(pending),
    }));
    const outcome = await pollShipment({
      load,
      signal: new AbortController().signal,
      maxAttempts: 4,
      sleep,
    });
    expect(outcome.kind).toBe("timeout");
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("ends without another read once aborted (unmount)", async () => {
    const controller = new AbortController();
    const load = vi.fn(async (): Promise<ActionResult<Order>> => {
      controller.abort();
      return { ok: true, data: order(pending) };
    });
    const outcome = await pollShipment({ load, signal: controller.signal, sleep });
    expect(outcome).toEqual({ kind: "aborted" });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("really waits between reads with the default sleep and stops it on abort", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const load = vi.fn(async (): Promise<ActionResult<Order>> => ({
        ok: true,
        data: order(pending),
      }));
      const running = pollShipment({ load, signal: controller.signal, intervalMs: 1000 });
      await vi.advanceTimersByTimeAsync(999);
      expect(load).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(load).toHaveBeenCalledTimes(1);
      controller.abort();
      await expect(running).resolves.toEqual({ kind: "aborted" });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

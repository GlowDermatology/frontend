import { describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/data/types";
import type { Order, OrderDelivery, ShipmentStage } from "@/domain/order";

import {
  dispatchPollAttempts,
  initialDispatchProgress,
  pollDispatch,
  type DispatchProgress,
} from "./dispatch-poll";

const delivery = (stage: ShipmentStage, patch: Partial<OrderDelivery> = {}): OrderDelivery => ({
  provider: "yandex",
  method: "standard",
  stage,
  promisedFrom: null,
  promisedTo: null,
  quoteFee: 22_000,
  carrierPrice: 19_000,
  offerPrice: null,
  approvedPrice: null,
  carrierCostTotal: null,
  costDifference: null,
  parcelWeightG: 650,
  preparedAt: null,
  courierName: null,
  courierVehicle: null,
  trackingUrl: null,
  claimStatus: null,
  claimNumber: 1,
  failureCode: null,
  openIssues: [],
  ...patch,
});

const orderAt = (stage: ShipmentStage, patch: Partial<OrderDelivery> = {}) =>
  ({ id: 10240, delivery: delivery(stage, patch) }) as Order;

const ok = (order: Order): ActionResult<Order> => ({ ok: true, data: order });
const noSleep = async () => undefined;

function loader(answers: ReadonlyArray<ActionResult<Order>>) {
  let index = 0;
  return vi.fn(async () => answers[Math.min(index++, answers.length - 1)]!);
}

describe("pollDispatch (10 s for up to 3 minutes while courier_requested)", () => {
  it("has 18 reads in its window", () => {
    expect(dispatchPollAttempts()).toBe(18);
    expect(initialDispatchProgress()).toEqual({ attempt: 0, maxAttempts: 18, elapsedMs: 0 });
  });

  it("waits 10 s between reads and stops when a courier is found", async () => {
    const sleep = vi.fn(noSleep);
    const load = loader([
      ok(orderAt("courier_requested")),
      ok(orderAt("courier_requested")),
      ok(orderAt("courier_assigned", { courierName: "Sardor" })),
    ]);
    const searching: Order[] = [];
    const progress: DispatchProgress[] = [];
    const outcome = await pollDispatch({
      load,
      signal: new AbortController().signal,
      sleep,
      onSearching: (order) => searching.push(order),
      onAttempt: (step) => progress.push(step),
    });
    expect(outcome).toMatchObject({
      kind: "settled",
      phase: { kind: "moved", stage: "courier_assigned" },
    });
    expect(load).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(10_000, expect.anything());
    expect(searching).toHaveLength(2);
    expect(progress.map((step) => step.elapsedMs)).toEqual([10_000, 20_000, 30_000]);
  });

  it("stops on a dispatch issue (failure, price review)", async () => {
    const review = orderAt("awaiting_dispatch", {
      openIssues: [
        {
          id: 3,
          kind: "dispatch_review",
          code: "increase_over_limit",
          urgent: false,
          openedAt: "2026-11-15T10:00:00+05:00",
        },
      ],
    });
    const outcome = await pollDispatch({
      load: loader([ok(review)]),
      signal: new AbortController().signal,
      sleep: noSleep,
    });
    expect(outcome).toMatchObject({
      kind: "settled",
      phase: { kind: "issue", issueKind: "dispatch_review" },
    });
    const failed = await pollDispatch({
      load: loader([ok(orderAt("failed", { failureCode: "performer_not_found" }))]),
      signal: new AbortController().signal,
      sleep: noSleep,
    });
    expect(failed).toMatchObject({ kind: "settled", phase: { kind: "issue", issueKind: null } });
  });

  it("retries a failed read and gives up after the window", async () => {
    const load = loader([
      { ok: false, error: "API bilan bog‘lanib bo‘lmadi.", code: "network_error" },
      ok(orderAt("courier_requested")),
    ]);
    const outcome = await pollDispatch({
      load,
      signal: new AbortController().signal,
      sleep: noSleep,
    });
    expect(outcome.kind).toBe("timeout");
    expect(outcome.kind === "timeout" && outcome.order?.delivery?.stage).toBe("courier_requested");
    expect(load).toHaveBeenCalledTimes(18);
  });

  it("stops quietly when the page aborts it", async () => {
    const controller = new AbortController();
    const load = vi.fn(async () => {
      controller.abort();
      return ok(orderAt("courier_assigned"));
    });
    expect(await pollDispatch({ load, signal: controller.signal, sleep: noSleep })).toEqual({
      kind: "aborted",
    });
  });
});

import type { ShopOrder, ShopProgressStep } from "@/domain/shop-account";

/**
 * The order's step bar, derived from the order status and its timeline so it
 * never contradicts the history below it (U8). The API's `progress[]`
 * supplies the localized labels and times; the states are recomputed:
 *
 * - a step is `done` when the status is at or past it, or the timeline has
 *   its event (a payment confirmed before a cancellation stays done);
 * - an open order's first step not done is `current`, later ones `upcoming`;
 * - a cancelled order marks the steps not done `skipped` and ends with the
 *   API's `cancelled` step (`done`).
 *
 * Pure; unit-tested.
 */

const RANK: Record<ShopOrder["status"], number> = {
  awaiting_payment: 1,
  processing: 2,
  handed_to_courier: 3,
  delivered: 4,
  cancelled: 0,
};

const STEP_RANK: Record<string, number> = {
  placed: 1,
  paid: 2,
  with_courier: 3,
  delivered: 4,
  picked_up: 4,
};

const STEP_EVENTS: Record<string, ReadonlyArray<string>> = {
  placed: ["order_created"],
  paid: ["payment_confirmed"],
  with_courier: ["handed_to_courier", "shipment_created"],
  delivered: ["delivered"],
  picked_up: ["delivered"],
};

export function deriveProgress(
  order: Pick<ShopOrder, "status" | "progress" | "timeline" | "fulfilment">,
): ShopProgressStep[] {
  const steps = order.progress.filter((step) => step.step !== "cancelled");
  const cancelledStep = order.progress.find((step) => step.step === "cancelled");
  const events = new Set(order.timeline.map((entry) => entry.type));
  const reached = RANK[order.status];
  const done = steps.map((step) => {
    const rank = STEP_RANK[step.step] ?? 99;
    // "placed" is always true; with_courier counts as passed once delivered.
    return (
      rank === 1 ||
      (reached > 0 && rank <= reached) ||
      (STEP_EVENTS[step.step] ?? []).some((type) => events.has(type))
    );
  });
  // Anything before a done step is done too (no gaps in the bar).
  for (let index = done.length - 1; index > 0; index -= 1) {
    if (done[index]) for (let before = 0; before < index; before += 1) done[before] = true;
  }
  const cancelled = order.status === "cancelled";
  let currentAssigned = false;
  const derived: ShopProgressStep[] = steps.map((step, index) => {
    if (done[index]) return { ...step, state: "done" };
    if (cancelled) return { ...step, state: "skipped", at: null };
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...step, state: "current", at: null };
    }
    return { ...step, state: "upcoming", at: null };
  });
  if (cancelled && cancelledStep) derived.push({ ...cancelledStep, state: "done" });
  return derived;
}

/**
 * The payment line of an order (U7): an order cancelled before it was paid
 * reads «To‘lanmagan», never the failed attempt's «To‘lov o‘tmadi».
 */
export function paymentLabel(
  order: { status: ShopOrder["status"]; payment: { status: string; statusLabel: string } },
  labels: { unpaid: string },
): string {
  if (
    order.status === "cancelled" &&
    order.payment.status !== "paid" &&
    order.payment.status !== "refunded"
  ) {
    return labels.unpaid;
  }
  return order.payment.statusLabel;
}

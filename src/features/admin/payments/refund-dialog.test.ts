import { describe, expect, it } from "vitest";

import type { ActionResult } from "@/data/types";
import type { Refund } from "@/domain/order";
import { CLICK_STILL_PAID_MESSAGE, type PaymentRecord } from "@/domain/payment";

import {
  canSubmit,
  CLOSED_DIALOG,
  dialogReducer,
  isPayout,
  keysToDrop,
  nextStep,
  operationKey,
  type RefundDialogState,
  type RefundOperation,
} from "./refund-dialog";
import { CLICK_UNAVAILABLE_MESSAGE } from "./refusals";

const refund: Refund = {
  id: 9,
  state: "failed",
  provider: "click",
  amount: 1_250_000,
  requestedAt: "2026-10-20T10:00:00+05:00",
  updatedAt: "2026-10-20T10:05:00+05:00",
};
const payment: PaymentRecord = {
  id: 244,
  orderId: 10244,
  customer: { id: "288", name: "Mijoz", phone: "+998901234567" },
  provider: "click",
  status: "paid",
  amount: 1_250_000,
  createdAt: "2026-10-19T10:00:00+05:00",
  refunds: [refund],
};
const settled: PaymentRecord = { ...payment, refunds: [{ ...refund, state: "succeeded" }] };

const close: RefundOperation = { kind: "close", manualPayout: false, payment, refund };
const payout: RefundOperation = { kind: "close", manualPayout: true, payment, refund };
const retry: RefundOperation = { kind: "retry", payment, refund };

const ok: ActionResult<PaymentRecord> = { ok: true, data: settled };
const stillPaid: ActionResult<PaymentRecord> = {
  ok: false,
  error: CLICK_STILL_PAID_MESSAGE,
  code: "invalid_transition",
};
const stillPaidCoded: ActionResult<PaymentRecord> = {
  ok: false,
  error: "Click pulni qaytarmadi.",
  code: "click_not_reversed",
};
const unavailable: ActionResult<PaymentRecord> = {
  ok: false,
  error: "Tashqi xizmat javob bermadi.",
  code: "provider_unavailable",
};
const changed: ActionResult<PaymentRecord> = {
  ok: false,
  error: "Bu qaytarishni yakunlab bo‘lmaydi.",
  code: "invalid_transition",
};
const reused: ActionResult<PaymentRecord> = {
  ok: false,
  error: "Kalit boshqa so‘rov uchun ishlatilgan.",
  code: "idempotency_key_reused",
};

const open = (op: RefundOperation): RefundDialogState =>
  dialogReducer(CLOSED_DIALOG, { type: "open", op });

describe("operation keys (one per payment, refund and step)", () => {
  it("gives each step its own key", () => {
    expect(operationKey(close)).toBe("244:9:close");
    expect(operationKey(payout)).toBe("244:9:payout");
    expect(operationKey(retry)).toBe("244:9:retry");
    expect(operationKey({ kind: "resolve", state: "succeeded", payment, refund })).toBe(
      "244:9:resolve-succeeded",
    );
    expect(operationKey({ kind: "resolve", state: "failed", payment, refund })).toBe(
      "244:9:resolve-failed",
    );
    expect(operationKey({ ...close, refund: { ...refund, id: 10 } })).toBe("244:10:close");
  });

  it("drops both close keys after a success and keeps keys after a refusal", () => {
    expect(keysToDrop(close, ok)).toEqual(["244:9:close", "244:9:payout"]);
    expect(keysToDrop(payout, ok)).toEqual(["244:9:close", "244:9:payout"]);
    expect(keysToDrop(retry, ok)).toEqual(["244:9:retry"]);
    // Click's 409 and a 503 are not stored by the backend: the same key retries safely.
    expect(keysToDrop(close, stillPaid)).toEqual([]);
    expect(keysToDrop(close, unavailable)).toEqual([]);
    expect(keysToDrop(payout, changed)).toEqual([]);
    expect(keysToDrop(payout, reused)).toEqual(["244:9:payout"]);
  });
});

describe("nextStep", () => {
  it("moves only the first close step to the payout step on Click's still-paid 409", () => {
    for (const result of [stillPaid, stillPaidCoded]) {
      const step = nextStep(close, result);
      expect(step).toEqual({
        type: "payout",
        op: { ...close, manualPayout: true },
        notice: { tone: "info", text: result.ok ? "" : result.error },
      });
    }
    // The payout step's own refusal never advances again.
    expect(nextStep(payout, stillPaidCoded)).toEqual({
      type: "retryable",
      notice: { tone: "error", text: "Click pulni qaytarmadi." },
    });
  });

  it("closes on success, re-reads a changed row, keeps the dialog for transient refusals", () => {
    expect(nextStep(close, ok)).toEqual({ type: "done", payment: settled });
    expect(nextStep(close, changed)).toEqual({
      type: "stale",
      message: changed.ok ? "" : changed.error,
    });
    expect(nextStep(close, unavailable)).toEqual({
      type: "retryable",
      notice: { tone: "error", text: CLICK_UNAVAILABLE_MESSAGE },
    });
    const fake: ActionResult<PaymentRecord> = {
      ok: false,
      error: "Click sinov rejimida: to‘lov holatini tekshirib bo‘lmaydi.",
      code: "invalid_transition",
    };
    expect(nextStep(close, fake)).toEqual({
      type: "retryable",
      notice: { tone: "error", text: fake.ok ? "" : fake.error },
    });
  });
});

describe("dialogReducer (finding: Enter, Enter must not attest a payout)", () => {
  it("enters the payout step disarmed, with focus moved to Click's answer", () => {
    const opened = open(close);
    expect(canSubmit(opened, false)).toBe(true);
    expect(canSubmit(opened, true)).toBe(false);

    const sent = dialogReducer(opened, { type: "submit" });
    const after = dialogReducer(sent, {
      type: "settle",
      op: close,
      outcome: nextStep(close, stillPaid),
    });
    expect(isPayout(after.op)).toBe(true);
    expect(after.notice).toEqual({ tone: "info", text: CLICK_STILL_PAID_MESSAGE });
    expect(after.payoutConfirmed).toBe(false);
    expect(after.noticeFocus).toBe(opened.noticeFocus + 1);
    // The second Enter finds a disabled button: nothing is sent.
    expect(canSubmit(after, false)).toBe(false);

    const ticked = dialogReducer(after, { type: "confirmPayout", checked: true });
    expect(canSubmit(ticked, false)).toBe(true);
    expect(canSubmit(dialogReducer(ticked, { type: "confirmPayout", checked: false }), false)).toBe(
      false,
    );
  });

  it("does not auto-advance on a repeated submit's answer", () => {
    const first = dialogReducer(open(close), {
      type: "settle",
      op: close,
      outcome: nextStep(close, stillPaid),
    });
    const ticked = dialogReducer(first, { type: "confirmPayout", checked: true });
    // A second answer to the close step (a repeated submit) arrives late:
    // the dialog neither re-enters the step nor resets or re-arms anything.
    const late = dialogReducer(ticked, {
      type: "settle",
      op: close,
      outcome: nextStep(close, stillPaid),
    });
    expect(late).toBe(ticked);
    // Nor does a success of that stale close step close the payout step.
    expect(dialogReducer(first, { type: "settle", op: close, outcome: nextStep(close, ok) })).toBe(
      first,
    );
    // An answer after the dialog was closed changes nothing.
    const closed = dialogReducer(first, { type: "close" });
    expect(
      dialogReducer(closed, { type: "settle", op: first.op!, outcome: nextStep(payout, ok) }),
    ).toBe(closed);
  });

  it("requires the checkbox when the payout step is opened from the row menu", () => {
    const opened = open(payout);
    expect(canSubmit(opened, false)).toBe(false);
    expect(opened.noticeFocus).toBe(0);
    const ticked = dialogReducer(opened, { type: "confirmPayout", checked: true });
    expect(canSubmit(ticked, false)).toBe(true);
    // Re-opening starts unticked again.
    expect(dialogReducer(ticked, { type: "open", op: payout }).payoutConfirmed).toBe(false);
    // The checkbox exists only on the payout step.
    expect(
      dialogReducer(open(close), { type: "confirmPayout", checked: true }).payoutConfirmed,
    ).toBe(false);
  });

  it("closes on success or a stale row and keeps the dialog with the notice otherwise", () => {
    const ticked = dialogReducer(open(payout), { type: "confirmPayout", checked: true });
    expect(
      dialogReducer(ticked, { type: "settle", op: payout, outcome: nextStep(payout, ok) }),
    ).toEqual({ ...CLOSED_DIALOG });
    expect(
      dialogReducer(ticked, { type: "settle", op: payout, outcome: nextStep(payout, changed) }).op,
    ).toBeNull();
    const kept = dialogReducer(ticked, {
      type: "settle",
      op: payout,
      outcome: nextStep(payout, unavailable),
    });
    expect(kept.op).toBe(payout);
    expect(kept.payoutConfirmed).toBe(true);
    expect(kept.notice).toEqual({ tone: "error", text: CLICK_UNAVAILABLE_MESSAGE });
    expect(dialogReducer(kept, { type: "submit" }).notice).toBeNull();
  });
});

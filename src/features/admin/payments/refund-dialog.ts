import type { ActionResult } from "@/data/types";
import type { Refund } from "@/domain/order";
import type { PaymentRecord } from "@/domain/payment";

import { shouldRenewKey } from "../shared/idempotency";
import { isClickStillPaidRefusal, isStaleRefundRefusal, refundRefusalMessage } from "./refusals";

/**
 * The refund dialog of the payments board as pure functions: which step an
 * answer leads to (`nextStep`), which idempotency keys an answer retires
 * (`keysToDrop`), and the dialog state those answers move (`dialogReducer`,
 * `canSubmit`). The component only runs the actions and the side effects.
 */

/** One refund operation the admin confirmed in the dialog. */
export type RefundOperation =
  | { kind: "retry"; payment: PaymentRecord; refund: Refund }
  | { kind: "resolve"; state: "succeeded" | "failed"; payment: PaymentRecord; refund: Refund }
  | {
      /** A failed Click refund closed after a Click status check; `manualPayout` = paid by hand. */
      kind: "close";
      manualPayout: boolean;
      payment: PaymentRecord;
      refund: Refund;
    };

export type RefundStep = "retry" | "resolve-succeeded" | "resolve-failed" | "close" | "payout";

export function operationStep(op: RefundOperation): RefundStep {
  if (op.kind === "retry") return "retry";
  if (op.kind === "resolve") return `resolve-${op.state}`;
  return op.manualPayout ? "payout" : "close";
}

/** The payout step: attests that staff paid the customer outside Click. */
export function isPayout(op: RefundOperation | null): boolean {
  return op?.kind === "close" && op.manualPayout;
}

/**
 * One key per payment, refund and step: the two close steps send different
 * bodies (`manual_payout` false / true), so they never share a key (a shared
 * one would be a 422 `idempotency_key_reused`).
 */
export function operationKey(op: RefundOperation): string {
  return `${op.payment.id}:${op.refund.id}:${operationStep(op)}`;
}

/**
 * The keys to forget after `result`. A success settles the refund: its key
 * goes, and so do both close steps' keys of that refund (the other step can
 * no longer be sent). A 422 reuse renews the step's key. Any other refusal
 * (Click's still-paid 409, a 503, the busy order, the network) keeps it:
 * the backend stores only 2xx answers, so a retry with the same body and key
 * is safe and a lost success is replayed instead of repeated.
 */
export function keysToDrop(op: RefundOperation, result: ActionResult<unknown>): string[] {
  if (!shouldRenewKey(result)) return [];
  if (result.ok && op.kind === "close") {
    return [
      operationKey({ ...op, manualPayout: false }),
      operationKey({ ...op, manualPayout: true }),
    ];
  }
  return [operationKey(op)];
}

/** The dialog's line under the text: Click's answer before the payout step, or a refusal. */
export interface DialogNotice {
  tone: "info" | "error";
  text: string;
}

/** What an answer to `op` leads to. */
export type StepOutcome =
  /** Done: the dialog closes, the row shows the answer. */
  | { type: "done"; payment: PaymentRecord }
  /** Click still holds the money: the payout step, never sent on its own. */
  | { type: "payout"; op: RefundOperation; notice: DialogNotice }
  /** The row changed under the board: close and re-read it. */
  | { type: "stale"; message: string }
  /** Nothing changed (busy order, Click's 503 or test mode, network): say why, keep the key. */
  | { type: "retryable"; notice: DialogNotice };

export function nextStep(op: RefundOperation, result: ActionResult<PaymentRecord>): StepOutcome {
  if (result.ok) return { type: "done", payment: result.data };
  // Only the first close step moves on; the payout step's own answer never
  // advances again.
  if (op.kind === "close" && !op.manualPayout && isClickStillPaidRefusal(result)) {
    return {
      type: "payout",
      op: { ...op, manualPayout: true },
      notice: { tone: "info", text: result.error },
    };
  }
  if (isStaleRefundRefusal(result)) return { type: "stale", message: result.error };
  return {
    type: "retryable",
    notice: { tone: "error", text: refundRefusalMessage(op.kind, result) },
  };
}

export interface RefundDialogState {
  op: RefundOperation | null;
  notice: DialogNotice | null;
  /** The payout step's "Mijozga … qo‘lda to‘ladim" checkbox: the payout button waits for it. */
  payoutConfirmed: boolean;
  /** Bumped when the dialog enters the payout step after Click's answer: focus goes to the notice. */
  noticeFocus: number;
}

export const CLOSED_DIALOG: RefundDialogState = {
  op: null,
  notice: null,
  payoutConfirmed: false,
  noticeFocus: 0,
};

export type RefundDialogEvent =
  | { type: "open"; op: RefundOperation }
  | { type: "close" }
  | { type: "confirmPayout"; checked: boolean }
  | { type: "submit" }
  /** The answer to `op`; ignored unless `op` is still the dialog's operation. */
  | { type: "settle"; op: RefundOperation; outcome: StepOutcome };

export function dialogReducer(
  state: RefundDialogState,
  event: RefundDialogEvent,
): RefundDialogState {
  switch (event.type) {
    case "open":
      return { ...state, op: event.op, notice: null, payoutConfirmed: false };
    case "close":
      return { ...state, op: null, notice: null, payoutConfirmed: false };
    case "confirmPayout":
      return isPayout(state.op) ? { ...state, payoutConfirmed: event.checked } : state;
    case "submit":
      return { ...state, notice: null };
    case "settle": {
      // An answer to an operation the dialog no longer shows (a repeated
      // submit, a dialog closed or moved on meanwhile) changes nothing: no
      // step is ever entered twice and the checkbox is never re-armed.
      if (state.op !== event.op) return state;
      const { outcome } = event;
      switch (outcome.type) {
        case "done":
        case "stale":
          return { ...state, op: null, notice: null, payoutConfirmed: false };
        case "payout":
          return {
            op: outcome.op,
            notice: outcome.notice,
            payoutConfirmed: false,
            noticeFocus: state.noticeFocus + 1,
          };
        case "retryable":
          return { ...state, notice: outcome.notice };
      }
    }
  }
}

/** Whether the dialog's primary button may send: the payout step needs its checkbox. */
export function canSubmit(state: RefundDialogState, pending: boolean): boolean {
  if (pending || state.op === null) return false;
  return !isPayout(state.op) || state.payoutConfirmed;
}

/** The toast after a success. */
export function successToast(op: RefundOperation): { title: string; description: string } {
  const order = `Buyurtma №${op.payment.orderId}`;
  if (op.kind === "retry") return { title: "Qaytarish qayta yuborildi", description: order };
  if (op.kind === "close") {
    // Without the payout, a close only succeeds when Click reported the payment reversed.
    return op.manualPayout
      ? { title: "Qaytarish yakunlandi", description: order }
      : {
          title: "Qaytarish yakunlandi",
          description: `${order}: Click pulni mijozga qaytardi — qo‘lda to‘lash kerak emas.`,
        };
  }
  return {
    title: op.state === "succeeded" ? "Qaytarish yakunlandi" : "Qaytarish bajarilmadi deb yopildi",
    description: order,
  };
}

import type { ToastInput } from "@/components/ui/toast";
import type { ActionResult } from "@/data/types";
import type { NotificationRecord } from "@/domain/notification";

import { newIdempotencyKey, shouldRenewKey } from "../shared/idempotency";

/**
 * "Bekor qilish" in the notification history (contract §2.8, M3): offered
 * for `scheduled` campaigns only; once the send started the backend refuses
 * it with 409 `conflict`.
 */
export function canCancelCampaign(record: Pick<NotificationRecord, "state">): boolean {
  return record.state === "scheduled";
}

/**
 * The idempotency key of a campaign's cancel (contract §1.7): one per
 * campaign, kept across re-opens and retries until `settleCancelKey`.
 */
export function cancelKeyFor(
  keys: Map<string, string>,
  campaignId: string,
  newKey: () => string = newIdempotencyKey,
): string {
  let key = keys.get(campaignId);
  if (!key) {
    key = newKey();
    keys.set(campaignId, key);
  }
  return key;
}

/** Drops the campaign's key after a success (a replay included) or a 422 reuse; keeps it otherwise. */
export function settleCancelKey(
  keys: Map<string, string>,
  campaignId: string,
  result: ActionResult<unknown>,
): void {
  if (shouldRenewKey(result)) keys.delete(campaignId);
}

export type CancelOutcome =
  /** Cancelled (or cancelled already): the row shows the answer. */
  | { type: "done"; record: NotificationRecord }
  /**
   * The campaign changed under the board — its send started (409
   * `conflict`) or it is gone (404, `gone`): close the dialog and say why.
   * In api mode the Server Action re-read the history in the same
   * roundtrip; a gone row is also dropped locally (the demo's only case: a
   * message scheduled in the page, which its fixtures never had).
   */
  | { type: "stale"; message: string; gone: boolean }
  /** Nothing changed (network, 503, a request still running): say why in the dialog, keep the key. */
  | { type: "retryable"; message: string };

export function cancelOutcome(result: ActionResult<NotificationRecord>): CancelOutcome {
  if (result.ok) return { type: "done", record: result.data };
  if (result.code === "conflict" || result.code === "not_found") {
    return { type: "stale", message: result.error, gone: result.code === "not_found" };
  }
  return { type: "retryable", message: result.error };
}

/** What the history does with an answer; every effect is required, so the view wires each one. */
export interface CancelEffects {
  /** Shows the message in the open dialog. */
  showError: (message: string) => void;
  /** Closes the dialog (focus then goes to the history table). */
  close: () => void;
  replaceRecord: (record: NotificationRecord) => void;
  dropRecord: (campaignId: string) => void;
  toast: (toast: ToastInput) => void;
}

export function applyCancelOutcome(
  outcome: CancelOutcome,
  target: Pick<NotificationRecord, "id" | "title">,
  effects: CancelEffects,
): void {
  switch (outcome.type) {
    case "retryable":
      effects.showError(outcome.message);
      return;
    case "stale":
      effects.close();
      if (outcome.gone) effects.dropRecord(target.id);
      effects.toast({ tone: "info", title: "Amal bajarilmadi", description: outcome.message });
      return;
    case "done":
      effects.close();
      effects.replaceRecord(outcome.record);
      effects.toast({
        title: "Xabar bekor qilindi",
        description: `«${target.title}» yuborilmaydi`,
      });
  }
}

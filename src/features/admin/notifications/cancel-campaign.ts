import type { ActionResult } from "@/data/types";
import type { NotificationRecord } from "@/domain/notification";

/**
 * "Bekor qilish" in the notification history (contract §2.8, M3): offered
 * for `scheduled` campaigns only; once the send started the backend refuses
 * it with 409 `conflict`.
 */
export function canCancelCampaign(record: Pick<NotificationRecord, "state">): boolean {
  return record.state === "scheduled";
}

export type CancelOutcome =
  /** Cancelled (or cancelled already): the row shows the answer. */
  | { type: "done"; record: NotificationRecord }
  /**
   * The campaign changed under the board — its send started (409
   * `conflict`) or it is gone (404): close the dialog, say why and re-read
   * the history.
   */
  | { type: "stale"; message: string }
  /** Nothing changed (network, 503, a request still running): say why in the dialog, keep the key. */
  | { type: "retryable"; message: string };

export function cancelOutcome(result: ActionResult<NotificationRecord>): CancelOutcome {
  if (result.ok) return { type: "done", record: result.data };
  if (result.code === "conflict" || result.code === "not_found") {
    return { type: "stale", message: result.error };
  }
  return { type: "retryable", message: result.error };
}

import type { ToastInput } from "@/components/ui/toast";
import type { ActionResult } from "@/data/types";
import type { CampaignAction } from "@/domain/campaign-actions";
import type { NotificationRecord } from "@/domain/notification";

import { newIdempotencyKey, shouldRenewKey } from "../shared/idempotency";

/**
 * The campaign operations of the history and the campaign panel (contract
 * §2.8, campaign approval): one idempotency key per operation and campaign
 * (`${action}:${id}`, contract §1.7), kept across re-opens and retries until
 * a success or a 422 reuse, and one classifier of the backend's answers for
 * every operation (cancel, stop, approve, confirm, return to draft, delete,
 * test send).
 */

/** The idempotency key of `action` on campaign `id`, created on first use. */
export function actionKeyFor(
  keys: Map<string, string>,
  action: CampaignAction | string,
  campaignId: string,
  newKey: () => string = newIdempotencyKey,
): string {
  const slot = `${action}:${campaignId}`;
  let key = keys.get(slot);
  if (!key) {
    key = newKey();
    keys.set(slot, key);
  }
  return key;
}

/** Drops the operation's key after a success (a replay included) or a 422 reuse; keeps it otherwise. */
export function settleActionKey(
  keys: Map<string, string>,
  action: CampaignAction | string,
  campaignId: string,
  result: ActionResult<unknown>,
): void {
  if (shouldRenewKey(result)) keys.delete(`${action}:${campaignId}`);
}

export type CampaignOutcome =
  /** The operation ran (or had run already): the row shows the answer. */
  | { type: "done"; record: NotificationRecord }
  /**
   * The campaign changed under the board — another state (409
   * `invalid_transition` / `conflict`), another revision (409 `conflict`),
   * gone (404, `gone`) — or this admin may not do it after all (403
   * `permission_denied`: the backend decides the role, the client only
   * hides). Close the dialog and say why; in api mode the Server Action
   * re-read the history in the same roundtrip; a gone row is also dropped
   * locally (the demo's case: a draft saved in the page, which its fixtures
   * never had).
   */
  | { type: "stale"; message: string; gone: boolean }
  /** Nothing changed (network, 503, a request still running): say why in the dialog, keep the key. */
  | { type: "retryable"; message: string };

const STALE_CODES = new Set(["conflict", "invalid_transition", "not_found", "permission_denied"]);

export function campaignOutcome(result: ActionResult<NotificationRecord>): CampaignOutcome {
  if (result.ok) return { type: "done", record: result.data };
  if (result.code && STALE_CODES.has(result.code)) {
    return { type: "stale", message: result.error, gone: result.code === "not_found" };
  }
  return { type: "retryable", message: result.error };
}

/** What the board does with an answer; every effect is required, so the view wires each one. */
export interface CampaignEffects {
  /** Shows the message in the open dialog (or the panel). */
  showError: (message: string) => void;
  /** Closes the dialog. */
  close: () => void;
  replaceRecord: (record: NotificationRecord) => void;
  dropRecord: (campaignId: string) => void;
  toast: (toast: ToastInput) => void;
}

export function applyCampaignOutcome(
  outcome: CampaignOutcome,
  target: Pick<NotificationRecord, "id">,
  success: ToastInput,
  effects: CampaignEffects,
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
      effects.toast(success);
  }
}

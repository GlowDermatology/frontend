import type { CampaignTest, NotificationRecord } from "./notification";

/**
 * Who may do what with a campaign (contract §2.8, campaign approval; the
 * backend enforces every rule, the client only hides the controls):
 *
 * - `edit` / `delete`: a `draft` or `tested` campaign, by its author or a
 *   superuser;
 * - `test`, `confirm`, `approve`, `returnToDraft`, `cancel`, `stop`:
 *   superusers only. A test can be sent while the campaign is a draft or
 *   tested; a delivered test of the current revision can be confirmed on a
 *   draft; a tested campaign whose confirmation names the current revision
 *   can be approved; a waiting (`scheduled`) or `cancelled` campaign that
 *   never started can go back to draft; a waiting one can be cancelled; a
 *   `sending` one stopped.
 */
export type CampaignAction =
  "edit" | "delete" | "test" | "confirm" | "approve" | "returnToDraft" | "cancel" | "stop";

export interface CampaignActor {
  id: string;
  isSuperuser: boolean;
}

type ActionRecord = Pick<
  NotificationRecord,
  "state" | "authorId" | "revision" | "testedRevision" | "startedAt" | "tests"
>;

const EDITABLE = new Set<NotificationRecord["state"]>(["draft", "tested"]);

export function allowedActions(
  record: ActionRecord,
  me: CampaignActor,
): ReadonlyArray<CampaignAction> {
  const actions: CampaignAction[] = [];
  const owner = record.authorId !== null && record.authorId === me.id;
  if (EDITABLE.has(record.state) && (owner || me.isSuperuser)) actions.push("edit", "delete");
  if (!me.isSuperuser) return actions;
  if (EDITABLE.has(record.state)) actions.push("test");
  if (record.state === "draft" && confirmableTests(record).length > 0) actions.push("confirm");
  if (record.state === "tested" && record.testedRevision === record.revision) {
    actions.push("approve");
  }
  if ((record.state === "scheduled" || record.state === "cancelled") && !record.startedAt) {
    actions.push("returnToDraft");
  }
  if (record.state === "scheduled") actions.push("cancel");
  if (record.state === "sending") actions.push("stop");
  return actions;
}

/** The tests FCM accepted for the current revision that nobody confirmed yet. */
export function confirmableTests(record: Pick<ActionRecord, "revision" | "tests">): CampaignTest[] {
  return record.tests.filter(
    (test) => test.fcmOk === true && test.revision === record.revision && !test.confirmedAt,
  );
}

/**
 * When the send would start if approved at `now`: the approval delay after
 * now, or the requested time when that is later (`dispatch_after =
 * max(now + delay, scheduled_at or now)`).
 */
export function dispatchEta(
  now: Date | string,
  delayMinutes: number,
  scheduledAt: string | null | undefined,
): Date {
  const base = typeof now === "string" ? Date.parse(now) : now.getTime();
  const earliest = base + delayMinutes * 60_000;
  const requested = scheduledAt ? Date.parse(scheduledAt) : Number.NaN;
  return new Date(Number.isNaN(requested) ? earliest : Math.max(earliest, requested));
}

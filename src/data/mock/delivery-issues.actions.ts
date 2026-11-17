import { deliveryIssueCopy } from "@/domain/copy/delivery-issues";
import type { DeliveryIssue, DispatchSuspension } from "@/domain/delivery-issue";
import type { Locale } from "@/lib/i18n/locales";

import type { ActionResult } from "../types";
import { delay } from "./delay";
import { mockNow, MOCK_SUSPENSION } from "./delivery-issues.queries";
import { DELIVERY_ISSUES, orderSeed } from "./orders";

/**
 * Mock bodies of `src/data/delivery-issues.actions.ts`: each looks the row
 * up by id (never trusting the client's copy), applies the backend's rules
 * (INTERFACES-ops) and answers the next state without saving it; a reload
 * restores the demo queue. Refusals use the backend's codes and messages
 * (`deliveryIssueCopy`, in the admin language).
 */

const notFound = (locale: Locale): ActionResult<never> => ({
  ok: false,
  error: deliveryIssueCopy[locale].notFound,
  code: "not_found",
});

export const ISSUE_RESOLVED_MESSAGE = deliveryIssueCopy.uz.issueResolved;
export const PICKUP_ISSUE_MESSAGE = deliveryIssueCopy.uz.pickupIssue;
export const UNTIL_PAST_MESSAGE = deliveryIssueCopy.uz.untilPast;

export async function resolveIssue(
  issueId: number,
  note: string,
  locale: Locale = "uz",
): Promise<ActionResult<DeliveryIssue>> {
  await delay(350);
  const issue = DELIVERY_ISSUES.find((row) => row.id === issueId);
  if (!issue) return notFound(locale);
  if (issue.state === "resolved") {
    return { ok: false, error: deliveryIssueCopy[locale].issueResolved, code: "conflict" };
  }
  const at = mockNow().toISOString();
  return {
    ok: true,
    data: {
      ...issue,
      state: "resolved",
      resolvedAt: at,
      updatedAt: at,
      resolvedBy: { id: "1", name: deliveryIssueCopy[locale].admin },
      resolutionNote: note,
    },
  };
}

export interface IncidentResult {
  issue: DeliveryIssue;
  /** `false`: the order's open incident was refreshed (200). */
  created: boolean;
}

export async function openIncident(
  orderId: number,
  note: string,
  urgent: boolean,
  locale: Locale = "uz",
): Promise<ActionResult<IncidentResult>> {
  await delay(350);
  const seed = orderSeed(orderId);
  if (!seed) return notFound(locale);
  if (seed.fulfilment !== "delivery") {
    return { ok: false, error: deliveryIssueCopy[locale].pickupIssue, code: "conflict" };
  }
  const at = mockNow().toISOString();
  const open = DELIVERY_ISSUES.find(
    (row) => row.orderId === orderId && row.kind === "incident" && row.state === "open",
  );
  if (open) {
    return { ok: true, data: { issue: { ...open, note, urgent, updatedAt: at }, created: false } };
  }
  const id = 900 + (orderId % 100);
  return {
    ok: true,
    data: {
      created: true,
      issue: {
        id,
        orderId,
        kind: "incident",
        code: "staff_report",
        urgent,
        details: {},
        note,
        state: "open",
        openedAt: at,
        updatedAt: at,
        remindedAt: null,
        reminders: 0,
        resolvedAt: null,
        resolvedBy: null,
        resolutionNote: "",
      },
    },
  };
}

export async function setDispatchSuspension(
  suspended: boolean,
  until: string | null,
  note: string,
  locale: Locale = "uz",
): Promise<ActionResult<DispatchSuspension>> {
  await delay(300);
  const now = mockNow();
  const m = deliveryIssueCopy[locale];
  if (suspended && until && Date.parse(until) <= now.getTime()) {
    return {
      ok: false,
      error: m.checkFields,
      code: "validation_error",
      fieldErrors: { until: m.untilPast },
    };
  }
  return {
    ok: true,
    data: {
      ...MOCK_SUSPENSION,
      suspended,
      until: suspended ? until : null,
      note,
      updatedAt: now.toISOString(),
    },
  };
}

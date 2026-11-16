import type { DeliveryIssue, DispatchSuspension } from "@/domain/delivery-issue";

import type { ActionResult } from "../types";
import { delay } from "./delay";
import { mockNow, MOCK_SUSPENSION } from "./delivery-issues.queries";
import { DELIVERY_ISSUES, orderSeed } from "./orders";

/**
 * Mock bodies of `src/data/delivery-issues.actions.ts`: each looks the row
 * up by id (never trusting the client's copy), applies the backend's rules
 * (INTERFACES-ops) and answers the next state without saving it; a reload
 * restores the demo queue. Refusals use the backend's codes and messages.
 */

const NOT_FOUND: ActionResult<never> = { ok: false, error: "Topilmadi.", code: "not_found" };

export const ISSUE_RESOLVED_MESSAGE = "Bu muammo allaqachon hal qilingan.";
export const PICKUP_ISSUE_MESSAGE =
  "Olib ketiladigan buyurtma uchun yetkazish muammosi ochilmaydi.";
export const UNTIL_PAST_MESSAGE = "Kelajakdagi vaqtni tanlang.";

const ADMIN = { id: "1", name: "Administrator" };

export async function resolveIssue(
  issueId: number,
  note: string,
): Promise<ActionResult<DeliveryIssue>> {
  await delay(350);
  const issue = DELIVERY_ISSUES.find((row) => row.id === issueId);
  if (!issue) return NOT_FOUND;
  if (issue.state === "resolved") {
    return { ok: false, error: ISSUE_RESOLVED_MESSAGE, code: "conflict" };
  }
  const at = mockNow().toISOString();
  return {
    ok: true,
    data: {
      ...issue,
      state: "resolved",
      resolvedAt: at,
      updatedAt: at,
      resolvedBy: ADMIN,
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
): Promise<ActionResult<IncidentResult>> {
  await delay(350);
  const seed = orderSeed(orderId);
  if (!seed) return NOT_FOUND;
  if (seed.fulfilment !== "delivery") {
    return { ok: false, error: PICKUP_ISSUE_MESSAGE, code: "conflict" };
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
): Promise<ActionResult<DispatchSuspension>> {
  await delay(300);
  const now = mockNow();
  if (suspended && until && Date.parse(until) <= now.getTime()) {
    return {
      ok: false,
      error: "Maydonlarni tekshiring.",
      code: "validation_error",
      fieldErrors: { until: UNTIL_PAST_MESSAGE },
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

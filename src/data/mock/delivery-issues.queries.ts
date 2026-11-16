import type { DeliveryIssue, DispatchSuspension, IssueAlerts } from "@/domain/delivery-issue";

import { DEMO_NOW } from "../config";
import type { IssueListQuery } from "../delivery-issues";
import { paginate, type Page } from "../types";
import { DELIVERY_ISSUES } from "./orders";

/**
 * Mock implementation of `src/data/delivery-issues.ts` over the demo queue
 * (`DELIVERY_ISSUES`, built with the Yandex demo orders). Ordering as the
 * backend's `issues_queryset`: open → urgent first, then oldest first;
 * resolved → newest resolved first.
 */

function byQueueOrder(a: DeliveryIssue, b: DeliveryIssue): number {
  if (a.state !== b.state) return a.state === "open" ? -1 : 1;
  if (a.state === "resolved") return (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? "");
  if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
  return a.openedAt.localeCompare(b.openedAt) || a.id - b.id;
}

export function filterIssues(
  issues: ReadonlyArray<DeliveryIssue>,
  query: Omit<IssueListQuery, "page" | "pageSize">,
): DeliveryIssue[] {
  return issues
    .filter(
      (issue) =>
        issue.state === query.state &&
        (query.urgent === undefined || issue.urgent === query.urgent) &&
        (!query.kind || issue.kind === query.kind) &&
        (query.order === undefined || issue.orderId === query.order),
    )
    .sort(byQueueOrder);
}

export async function listDeliveryIssues(query: IssueListQuery): Promise<Page<DeliveryIssue>> {
  return paginate(filterIssues(DELIVERY_ISSUES, query), query.page, query.pageSize);
}

/** The shell poll: open count and the open urgent issues. */
export async function getIssueAlerts(): Promise<IssueAlerts> {
  const open = DELIVERY_ISSUES.filter((issue) => issue.state === "open");
  return {
    open: open.length,
    urgent: filterIssues(open, { state: "open", urgent: true }).map((issue) => ({
      id: issue.id,
      orderId: issue.orderId,
      kind: issue.kind,
      code: issue.code,
      openedAt: issue.openedAt,
    })),
  };
}

/** The demo dispatches couriers normally (the switch is off). */
export const MOCK_SUSPENSION: DispatchSuspension = {
  suspended: false,
  until: null,
  note: "",
  updatedAt: "2026-10-20T09:00:00+05:00",
};

export async function getDispatchSuspension(): Promise<DispatchSuspension> {
  return { ...MOCK_SUSPENSION };
}

/** For the actions: the demo clock. */
export const mockNow = () => new Date(DEMO_NOW);

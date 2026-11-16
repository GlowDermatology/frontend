import {
  ISSUE_STATES,
  type DeliveryIssue,
  type DispatchSuspension,
  type IssueAlert,
  type IssueAlerts,
} from "@/domain/delivery-issue";
import { DELIVERY_ISSUE_KINDS, type DeliveryIssueKind } from "@/domain/order";

import type { IssueListQuery } from "../../delivery-issues";
import type { QueryValue } from "../client";
import type {
  ApiDeliveryIssue,
  ApiPaginatedDeliveryIssues,
  ApiSuspension,
  ApiSuspensionBody,
} from "../types";
import { idString } from "./common";

/**
 * The delivery exception queue and the dispatch switch (Yandex Delivery
 * plan §3.9, INTERFACES-ops): API → domain and the screen's query → API
 * parameters. Pure functions, unit-tested.
 */

const isKind = (value: unknown): value is DeliveryIssueKind =>
  DELIVERY_ISSUE_KINDS.some((kind) => kind === value);

/**
 * `DeliveryIssue` → domain. A kind this build does not know keeps its code
 * as the kind's label on screen (`issueKindLabel`), so a row is never lost;
 * `details` is reduced to a plain object.
 */
export function mapDeliveryIssue(api: ApiDeliveryIssue): DeliveryIssue {
  const details =
    typeof api.details === "object" && api.details !== null && !Array.isArray(api.details)
      ? (api.details as Record<string, unknown>)
      : {};
  return {
    id: api.id,
    orderId: api.order_id,
    kind: api.kind as DeliveryIssueKind,
    code: api.code,
    urgent: api.urgent,
    details,
    note: api.note ?? "",
    state: ISSUE_STATES.includes(api.state) ? api.state : "open",
    openedAt: api.opened_at,
    updatedAt: api.updated_at,
    remindedAt: api.reminded_at,
    reminders: api.reminders ?? 0,
    resolvedAt: api.resolved_at,
    resolvedBy: api.resolved_by
      ? {
          id: idString(api.resolved_by.id),
          name: api.resolved_by.display_name || `#${api.resolved_by.id}`,
        }
      : null,
    resolutionNote: api.resolution_note ?? "",
  };
}

/** `?state=&urgent=&kind=&order=&page=&page_size=` of `GET delivery/issues/`. */
export function issueListParams(query: IssueListQuery): Record<string, QueryValue> {
  return {
    state: query.state,
    urgent: query.urgent,
    kind: query.kind,
    order: query.order,
    page: query.page,
    page_size: query.pageSize,
  };
}

/** The poll's read: open urgent issues, newest last (the API orders open ones oldest first). */
export const URGENT_ALERT_PARAMS: Record<string, QueryValue> = {
  state: "open",
  urgent: true,
  page_size: 50,
};

/** Open urgent rows of a `delivery/issues/` page → the poll's alerts (unknown kinds skipped). */
export function mapIssueAlerts(open: number, page: ApiPaginatedDeliveryIssues): IssueAlerts {
  const urgent: IssueAlert[] = [];
  for (const row of page.results) {
    if (!row.urgent || row.state !== "open" || !isKind(row.kind)) continue;
    urgent.push({
      id: row.id,
      orderId: row.order_id,
      kind: row.kind,
      code: row.code,
      openedAt: row.opened_at,
    });
  }
  return { open: Math.max(0, open), urgent };
}

export function mapSuspension(api: ApiSuspension): DispatchSuspension {
  return {
    suspended: api.suspended,
    until: api.until,
    note: api.note ?? "",
    updatedAt: api.updated_at,
  };
}

/**
 * `POST delivery/suspension/` body: `until` only while suspending (the API
 * ignores it when resuming), as an aware instant; the note trimmed.
 */
export function suspensionBody(input: {
  suspended: boolean;
  until?: string | null;
  note?: string;
}): ApiSuspensionBody {
  const note = (input.note ?? "").trim();
  if (!input.suspended) return { suspended: false, note };
  return { suspended: true, until: input.until || null, note };
}

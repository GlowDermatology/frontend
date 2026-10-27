import type { Route } from "next";

import {
  NOTIFICATION_KINDS,
  NOTIFICATION_PAGE_SIZES,
  NOTIFICATION_STATES,
  type NotificationHistoryQuery,
  type NotificationPageSize,
} from "@/domain/notification";

import {
  firstParam,
  oneOf,
  positiveInt,
  toQueryString,
  type SearchParams,
} from "../shared/url-state";

/**
 * URL state of the notifications history (gap X-NOTIF-HISTORY): `state`,
 * `kind`, `page` and `size` (20 or 50) next to the composer's own
 * `customer` prefill, which the history links keep.
 */

const SIZES = NOTIFICATION_PAGE_SIZES.map(String) as ReadonlyArray<`${NotificationPageSize}`>;

export function parseNotificationQuery(params: SearchParams): NotificationHistoryQuery {
  const size = oneOf(firstParam(params, "size"), SIZES);
  return {
    state: oneOf(firstParam(params, "state"), NOTIFICATION_STATES),
    kind: oneOf(firstParam(params, "kind"), NOTIFICATION_KINDS),
    page: positiveInt(firstParam(params, "page"), 1),
    pageSize: size ? (Number(size) as NotificationPageSize) : 20,
  };
}

/** URL for a history query, omitting defaults. */
export function notificationListHref(
  query: Partial<NotificationHistoryQuery> & { customer?: string },
  base = "/admin/notifications",
): Route {
  return `${base}${toQueryString({
    customer: query.customer,
    state: query.state,
    kind: query.kind,
    size: query.pageSize && query.pageSize !== 20 ? query.pageSize : undefined,
    page: query.page && query.page > 1 ? query.page : undefined,
  })}` as Route;
}

export function hasNotificationFilters(query: NotificationHistoryQuery): boolean {
  return Boolean(query.state || query.kind);
}

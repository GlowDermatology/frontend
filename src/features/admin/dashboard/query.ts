import { DASHBOARD_RANGES, type DashboardQuery } from "@/domain/dashboard";

import { firstParam, isoDateParam, oneOf, type SearchParams } from "../shared/url-state";

/**
 * `/admin?range=today|week|month` or `/admin?range=custom&from=&to=`. A
 * malformed day is dropped (the screen then reports it as missing, like the
 * API would); anything but a known range is `today`.
 */
export type ParsedDashboardQuery =
  { range: (typeof DASHBOARD_RANGES)[number] } | { range: "custom"; from?: string; to?: string };

export function parseDashboardQuery(params: SearchParams): ParsedDashboardQuery {
  const range = firstParam(params, "range");
  if (range === "custom") {
    return {
      range: "custom",
      from: isoDateParam(firstParam(params, "from")),
      to: isoDateParam(firstParam(params, "to")),
    };
  }
  return { range: oneOf(range, DASHBOARD_RANGES) ?? "today" };
}

export function dashboardHref(query: DashboardQuery): string {
  if (query.range === "custom") return `/admin?range=custom&from=${query.from}&to=${query.to}`;
  return query.range === "today" ? "/admin" : `/admin?range=${query.range}`;
}

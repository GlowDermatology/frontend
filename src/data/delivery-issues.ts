import "server-only";

import type {
  DeliveryIssue,
  DispatchSuspension,
  IssueAlerts,
  IssueState,
} from "@/domain/delivery-issue";
import type { DeliveryIssueKind } from "@/domain/order";

import {
  apiGetSuspension,
  apiListDeliveryIssues,
  apiListDeliveryIssuesFresh,
  apiNavCountsFresh,
} from "./api/delivery";
import { isApiError } from "./api/errors";
import {
  issueListParams,
  mapDeliveryIssue,
  mapIssueAlerts,
  mapSuspension,
  URGENT_ALERT_PARAMS,
} from "./api/mappers/delivery-issues";
import { mapPage } from "./api/mappers/page";
import { requireApiToken, verifyStaff } from "./auth";
import * as mock from "./mock/delivery-issues.queries";
import { dataSource } from "./source";
import type { Page } from "./types";

/**
 * Delivery exception queue read seam (Yandex Delivery plan §3.9,
 * INTERFACES-ops). The mock branch reads the demo queue
 * (`./mock/delivery-issues.queries.ts`); the api branch calls
 * `delivery/issues/`, `delivery/suspension/` and, for the shell's poll,
 * `nav-counts/`.
 */

import type { IssuePageSize } from "@/domain/delivery-issue";

export { ISSUE_PAGE_SIZES, type IssuePageSize } from "@/domain/delivery-issue";

export interface IssueListQuery {
  state: IssueState;
  /** `true`: urgent only; `false`: not urgent; absent: both. */
  urgent?: boolean;
  kind?: DeliveryIssueKind;
  order?: number;
  page: number;
  pageSize: IssuePageSize;
}

/** `GET /api/v1/admin/delivery/issues/?state=&urgent=&kind=&order=&page=&page_size=` */
export async function listDeliveryIssues(query: IssueListQuery): Promise<Page<DeliveryIssue>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListDeliveryIssues(token, issueListParams(query));
    return mapPage(data, mapDeliveryIssue);
  }
  return mock.listDeliveryIssues(query);
}

/** `GET delivery/suspension/` — whether courier dispatch is suspended now. */
export async function getDispatchSuspension(): Promise<DispatchSuspension> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    return mapSuspension((await apiGetSuspension(token)).data);
  }
  return mock.getDispatchSuspension();
}

export type IssueAlertsResult =
  { ok: true; alerts: IssueAlerts } | { ok: false; status: 401 | 502 };

/**
 * The shell's 30 s poll (route handler `/admin/delivery-issues/alerts`):
 * `nav-counts.delivery_issues_open` and the open urgent issues, read fresh
 * in parallel. No session → 401 (the poll stops); an API failure → 502
 * (the poll keeps the last values and backs off).
 */
export async function getIssueAlerts(): Promise<IssueAlertsResult> {
  const session = await verifyStaff();
  if (!session.ok) return { ok: false, status: 401 };
  if ((await dataSource()) !== "api" || session.mode !== "api") {
    return { ok: true, alerts: await mock.getIssueAlerts() };
  }
  try {
    const [counts, urgent] = await Promise.all([
      apiNavCountsFresh(session.token),
      apiListDeliveryIssuesFresh(session.token, URGENT_ALERT_PARAMS),
    ]);
    return {
      ok: true,
      alerts: mapIssueAlerts(counts.data.delivery_issues_open ?? 0, urgent.data),
    };
  } catch (error) {
    if (isApiError(error) && error.status === 401) return { ok: false, status: 401 };
    if (isApiError(error)) return { ok: false, status: 502 };
    throw error;
  }
}

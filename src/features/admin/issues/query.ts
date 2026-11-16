import type { Route } from "next";

import type { IssueListQuery } from "@/data/delivery-issues";
import { ISSUE_PAGE_SIZES, ISSUE_STATES } from "@/domain/delivery-issue";
import { DELIVERY_ISSUE_KINDS } from "@/domain/order";

import {
  firstParam,
  oneOf,
  positiveInt,
  toQueryString,
  type SearchParams,
} from "../shared/url-state";

/**
 * `/admin/delivery-issues?state=open|resolved&urgent=1|0&kind=&order=&page=&size=20|50`
 * (the path the Telegram bot links to: `…/admin/delivery-issues`). A
 * malformed value is dropped rather than sent to the API; the defaults
 * (open issues, 20 rows) are left out of the links.
 */

export const ISSUES_PATH = "/admin/delivery-issues";
const DEFAULT_SIZE = 20;

export function parseIssueQuery(params: SearchParams): IssueListQuery {
  const urgent = firstParam(params, "urgent");
  const order = firstParam(params, "order");
  const size = positiveInt(firstParam(params, "size"), DEFAULT_SIZE);
  return {
    state: oneOf(firstParam(params, "state"), ISSUE_STATES) ?? "open",
    urgent: urgent === "1" ? true : urgent === "0" ? false : undefined,
    kind: oneOf(firstParam(params, "kind"), DELIVERY_ISSUE_KINDS),
    order: order && /^\d{1,12}$/.test(order) && Number(order) > 0 ? Number(order) : undefined,
    page: positiveInt(firstParam(params, "page"), 1),
    pageSize: (ISSUE_PAGE_SIZES as ReadonlyArray<number>).includes(size)
      ? (size as IssueListQuery["pageSize"])
      : DEFAULT_SIZE,
  };
}

export function issueListHref(query: Partial<IssueListQuery>): Route {
  return `${ISSUES_PATH}${toQueryString({
    state: query.state && query.state !== "open" ? query.state : undefined,
    urgent: query.urgent === undefined ? undefined : query.urgent ? "1" : "0",
    kind: query.kind,
    order: query.order,
    page: query.page && query.page > 1 ? query.page : undefined,
    size: query.pageSize && query.pageSize !== DEFAULT_SIZE ? query.pageSize : undefined,
  })}` as Route;
}

export function hasIssueFilters(query: IssueListQuery): boolean {
  return query.urgent !== undefined || Boolean(query.kind) || query.order !== undefined;
}

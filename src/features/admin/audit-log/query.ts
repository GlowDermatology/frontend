import type { Route } from "next";

import { AUDIT_ORDERINGS, type AuditFilters } from "@/domain/audit";

import {
  firstParam,
  oneOf,
  parseSearchParam,
  positiveInt,
  toQueryString,
  type SearchParams,
} from "../shared/url-state";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ACTION = /^[a-z_]{2,40}(\.[a-z_]{2,40}){1,2}$/;
const OBJECT_TYPE = /^[a-z_-]{2,40}$/;

const validDate = (value: string | undefined) =>
  value && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00+05:00`))
    ? value
    : undefined;

/**
 * `/admin/audit-log?actor=1&action=appointment.created&object_type=appointment
 * &object_id=12&date_from=2026-10-01&date_to=2026-10-26&ordering=at&page=2`,
 * validated: a malformed value is dropped rather than sent to the API.
 */
export function parseAuditFilters(params: SearchParams): AuditFilters {
  const actor = firstParam(params, "actor");
  const action = firstParam(params, "action");
  const objectType = firstParam(params, "object_type");
  const objectId = parseSearchParam(firstParam(params, "object_id"));
  return {
    actor: actor && /^\d{1,12}$/.test(actor) && Number(actor) > 0 ? actor : undefined,
    action: action && ACTION.test(action) ? action : undefined,
    objectType: objectType && OBJECT_TYPE.test(objectType) ? objectType : undefined,
    objectId: objectId && objectId.length <= 64 ? objectId : undefined,
    dateFrom: validDate(firstParam(params, "date_from")),
    dateTo: validDate(firstParam(params, "date_to")),
    ordering: oneOf(firstParam(params, "ordering"), AUDIT_ORDERINGS) ?? "-at",
    page: positiveInt(firstParam(params, "page"), 1),
  };
}

/** The query string of a filter set (defaults omitted, so the bare URL is the default view). */
export function auditQuery(filters: AuditFilters): string {
  return toQueryString({
    actor: filters.actor,
    action: filters.action,
    object_type: filters.objectType,
    object_id: filters.objectId,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    ordering: filters.ordering === "-at" ? undefined : filters.ordering,
    page: filters.page > 1 ? filters.page : undefined,
  });
}

export function auditHref(filters: AuditFilters): Route {
  return `/admin/audit-log${auditQuery(filters)}` as Route;
}

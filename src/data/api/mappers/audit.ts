import type { AuditEntry, AuditFilters } from "@/domain/audit";

import type { QueryValue } from "../client";
import type { ApiAuditEntry } from "../types";
import { idString } from "./common";

/** `AuditEntry` (contract §2.13) → the FE domain type; `null` actor = the system. */
export function mapAuditEntry(api: ApiAuditEntry): AuditEntry {
  return {
    id: idString(api.id),
    at: api.at,
    actor: api.actor ? api.actor.display_name || `#${api.actor.id}` : null,
    actorId: api.actor ? idString(api.actor.id) : null,
    action: api.action,
    objectType: api.object_type,
    objectId: api.object_id,
    data: api.data ?? null,
    ip: api.ip,
    requestId: api.request_id,
  };
}

/** The URL filters → `audit-log/` query parameters (`page` and `page_size` excluded). */
export function auditFilterParams(filters: AuditFilters): Record<string, QueryValue> {
  return {
    actor: filters.actor,
    action: filters.action,
    object_type: filters.objectType,
    object_id: filters.objectId,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    ordering: filters.ordering === "-at" ? undefined : filters.ordering,
  };
}

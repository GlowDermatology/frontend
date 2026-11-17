import type { AuditEntry, AuditFacets, AuditFilters } from "@/domain/audit";

import type { QueryValue } from "../client";
import type { ApiAuditEntry, ApiAuditFacets } from "../types";
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
    request_id: filters.requestId,
    ordering: filters.ordering === "-at" ? undefined : filters.ordering,
  };
}

/** `GET audit-log/facets/` → the FE facets (lists copied, sorted as the API sends them). */
export function mapAuditFacets(api: ApiAuditFacets): AuditFacets {
  return {
    tier: api.tier,
    ipVisible: api.ip_visible,
    visiblePrefixes: [...api.visible_prefixes],
    ownOnlyPrefixes: [...api.own_only_prefixes],
    hiddenActions: [...api.hidden_actions],
  };
}

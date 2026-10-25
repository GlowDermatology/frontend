import type { AuditEntry, AuditFilters } from "@/domain/audit";
import { toLocalIsoDate } from "@/lib/format";

import { paginate, type Page } from "../types";
import { MOCK_AUDIT } from "./audit";

/** Mock implementation of `src/data/audit.ts`: the API's filters applied to the fixtures. */

export function filterAudit(filters: AuditFilters): AuditEntry[] {
  const rows = MOCK_AUDIT.filter((entry) => {
    if (filters.actor && entry.actorId !== filters.actor) return false;
    if (filters.action && entry.action !== filters.action) return false;
    if (filters.objectType && entry.objectType !== filters.objectType) return false;
    if (filters.objectId && entry.objectId !== filters.objectId) return false;
    const day = toLocalIsoDate(entry.at);
    if (filters.dateFrom && day < filters.dateFrom) return false;
    if (filters.dateTo && day > filters.dateTo) return false;
    return true;
  });
  return filters.ordering === "at" ? rows.reverse() : rows;
}

export async function listAuditLog(
  filters: AuditFilters,
  pageSize: number,
): Promise<Page<AuditEntry>> {
  return paginate(filterAudit(filters), filters.page, pageSize);
}

import "server-only";

import type { AuditEntry, AuditFacets, AuditFilters } from "@/domain/audit";

import { apiAuditFacets, apiListAuditLog } from "./api/admin";
import { auditFilterParams, mapAuditEntry, mapAuditFacets } from "./api/mappers/audit";
import { mapPage } from "./api/mappers/page";
import { requireApiToken } from "./auth";
import * as mock from "./mock/audit.queries";
import { dataSource } from "./source";
import type { Page } from "./types";

/**
 * Audit log read seam (contract §2.13 `GET audit-log/`, pages of 20, and `GET audit-log/facets/`).
 * The backend limits the rows to the viewer's tier (DESIGN §D); the facets say which filters to
 * offer and whether the IP column exists. Mock mode is the superuser's view.
 */

export const AUDIT_PAGE_SIZE = 20;

export async function listAuditLog(filters: AuditFilters): Promise<Page<AuditEntry>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListAuditLog(token, {
      ...auditFilterParams(filters),
      page: filters.page,
      page_size: AUDIT_PAGE_SIZE,
    });
    return mapPage(data, mapAuditEntry);
  }
  return mock.listAuditLog(filters, AUDIT_PAGE_SIZE);
}

/** `GET /api/v1/admin/audit-log/facets/`; mock mode: the superuser tier (everything, IPs shown). */
export async function getAuditFacets(): Promise<AuditFacets> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    return mapAuditFacets((await apiAuditFacets(token)).data);
  }
  return mock.getAuditFacets();
}

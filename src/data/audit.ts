import "server-only";

import type { AuditEntry, AuditFilters } from "@/domain/audit";

import { apiListAuditLog } from "./api/admin";
import { auditFilterParams, mapAuditEntry } from "./api/mappers/audit";
import { mapPage } from "./api/mappers/page";
import { requireApiToken } from "./auth";
import * as mock from "./mock/audit.queries";
import { dataSource } from "./source";
import type { Page } from "./types";

/** Audit log read seam (contract §2.13 `GET audit-log/`, pages of 20). */

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

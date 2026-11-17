import { type NextRequest } from "next/server";

import { auditFilterParams } from "@/data/api/mappers/audit";
import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { filterAudit } from "@/data/mock/audit.queries";
import { auditActionLabel, auditActorLabel, auditObjectLabel } from "@/domain/audit";
import { auditLogCopy } from "@/features/admin/audit-log/copy";
import { parseAuditFilters } from "@/features/admin/audit-log/query";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

/**
 * Audit log export (contract §1.8 `harakatlar-jurnali`) with the screen's filters, request id
 * included. Api mode streams Django's file (headers in the request language, IPs blank for
 * ordinary staff); the mock file uses the admin language for its headers and labels.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filters = parseAuditFilters(params);
  return exportRoute({
    resource: "audit-log",
    name: "harakatlar-jurnali",
    format: parseExportFormat(params.format),
    apiParams: auditFilterParams(filters),
    signal: request.signal,
    mock: async () => {
      const locale = await getAdminLocale();
      return {
        header: [...auditLogCopy[locale].export.header],
        rows: filterAudit(filters).map((e) => [
          Number(e.id),
          csvDateTime(e.at),
          auditActorLabel(e.actor, locale),
          auditActionLabel(e.action, locale),
          auditObjectLabel(e.objectType, locale),
          e.objectId,
          e.ip ?? "",
          e.requestId,
        ]),
      };
    },
  });
}

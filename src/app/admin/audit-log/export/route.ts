import { type NextRequest } from "next/server";

import { auditFilterParams } from "@/data/api/mappers/audit";
import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { filterAudit } from "@/data/mock/audit.queries";
import { auditActionLabel, auditObjectLabel } from "@/domain/audit";
import { parseAuditFilters } from "@/features/admin/audit-log/query";

/** Audit log export (contract §1.8 `harakatlar-jurnali`) with the screen's filters. */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filters = parseAuditFilters(params);
  return exportRoute({
    resource: "audit-log",
    name: "harakatlar-jurnali",
    format: parseExportFormat(params.format),
    apiParams: auditFilterParams(filters),
    signal: request.signal,
    mock: async () => ({
      header: ["ID", "Sana", "Xodim", "Amal", "Obyekt", "Obyekt ID", "IP", "So‘rov ID"],
      rows: filterAudit(filters).map((e) => [
        Number(e.id),
        csvDateTime(e.at),
        e.actor ?? "Tizim",
        auditActionLabel(e.action),
        auditObjectLabel(e.objectType),
        e.objectId,
        e.ip ?? "",
        e.requestId,
      ]),
    }),
  });
}

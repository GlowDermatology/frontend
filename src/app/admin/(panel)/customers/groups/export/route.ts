import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { exportSegments } from "@/data/mock/segments.queries";
import { groupsCopy } from "@/features/admin/groups/copy";
import { copyFor } from "@/lib/i18n/admin-locale";

/**
 * Customer groups export (contract §1.8 `guruhlar`). Api mode streams Django's file (headers in
 * the request language); the mock file takes its headers from the admin language.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return exportRoute({
    resource: "segments",
    name: "guruhlar",
    format: parseExportFormat(params.format),
    apiParams: {},
    signal: request.signal,
    mock: async () => ({
      header: [...(await copyFor(groupsCopy)).exports.groups],
      rows: (await exportSegments()).map((s) => [
        Number(s.id) || s.id,
        s.name,
        s.memberCount,
        s.size,
      ]),
    }),
  });
}

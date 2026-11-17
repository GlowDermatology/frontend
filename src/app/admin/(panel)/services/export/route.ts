import { parseExportFormat } from "@/data/api/mappers/export";
import { serviceListParams } from "@/data/api/mappers/clinic";
import { exportRoute } from "@/data/export";
import { filterServices } from "@/data/mock/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { servicesCopy } from "@/features/admin/services/copy";
import { parseServiceQuery } from "@/features/admin/specialists/query";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

/** Services export (contract §1.8 `xizmatlar`): the list's filters and ordering. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  // Api mode streams Django's file (headers in the request language); the mock file follows the
  // admin language.
  const locale = await getAdminLocale();
  const m = clinicDataCopy[locale];
  const query = parseServiceQuery(params);
  return exportRoute({
    resource: "services",
    name: "xizmatlar",
    format: parseExportFormat(params.format),
    apiParams: serviceListParams({ ...query, page: undefined, pageSize: undefined }),
    signal: request.signal,
    mock: async () => ({
      header: [...servicesCopy[locale].exportHeader],
      rows: filterServices(query).map((s) => [
        Number(s.id),
        s.name[locale] || s.name.uz,
        s.shortName[locale] || s.shortName.uz,
        m.category[s.category],
        s.defaultDurationMin,
        s.defaultPrice ?? "",
        s.specialistCount,
        s.isActive ? m.status.active : m.status.inactive,
      ]),
    }),
  });
}

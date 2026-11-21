import { parseExportFormat } from "@/data/api/mappers/export";
import { specialistListParams } from "@/data/api/mappers/clinic";
import { exportRoute } from "@/data/export";
import { filterSpecialists } from "@/data/mock/clinic";
import { workingDaysShort } from "@/domain/clinic";
import { clinicDataCopy } from "@/domain/copy/clinic";
import { specialistsCopy } from "@/features/admin/specialists/copy";
import { parseSpecialistQuery } from "@/features/admin/specialists/query";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

/** Specialists export (contract §1.8 `mutaxassislar`): the list's filters and ordering. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  // Api mode streams Django's file (headers in the request language); the mock file follows the
  // admin language.
  const locale = await getAdminLocale();
  const m = clinicDataCopy[locale];
  const query = parseSpecialistQuery(params);
  return exportRoute({
    resource: "specialists",
    name: "mutaxassislar",
    format: parseExportFormat(params.format),
    apiParams: specialistListParams({ ...query, page: undefined, pageSize: undefined }),
    signal: request.signal,
    mock: async () => ({
      header: [...specialistsCopy[locale].exportHeader],
      rows: filterSpecialists(query).map((s) => [
        Number(s.id),
        s.name,
        s.role ? m.role[s.role] : "",
        s.experienceYears ?? "",
        s.services
          .filter((o) => o.isActive)
          .map((o) => o.shortName)
          .join(", "),
        workingDaysShort(s.workingHours, locale),
        s.upcomingAppointments,
        s.isActive ? m.status.active : m.status.inactive,
      ]),
    }),
  });
}

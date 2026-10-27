import { parseExportFormat } from "@/data/api/mappers/export";
import { specialistListParams } from "@/data/api/mappers/clinic";
import { exportRoute } from "@/data/export";
import { filterSpecialists } from "@/data/mock/clinic";
import { workingDaysShort } from "@/domain/clinic";
import { SPECIALIST_ROLE_LABEL } from "@/domain/clinic";
import { parseSpecialistQuery } from "@/features/admin/specialists/query";

/** Specialists export (contract §1.8 `mutaxassislar`): the list's filters and ordering. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseSpecialistQuery(params);
  return exportRoute({
    resource: "specialists",
    name: "mutaxassislar",
    format: parseExportFormat(params.format),
    apiParams: specialistListParams({ ...query, page: undefined, pageSize: undefined }),
    signal: request.signal,
    mock: async () => ({
      header: [
        "ID",
        "Ism",
        "Mutaxassislik",
        "Tajriba (yil)",
        "Xizmatlar",
        "Ish kunlari",
        "Kelgusi qabullar",
        "Holat",
      ],
      rows: filterSpecialists(query).map((s) => [
        Number(s.id),
        s.name,
        SPECIALIST_ROLE_LABEL[s.role],
        s.experienceYears ?? "",
        s.services
          .filter((o) => o.isActive)
          .map((o) => o.shortName)
          .join(", "),
        workingDaysShort(s.workingHours),
        s.upcomingAppointments,
        s.isActive ? "Faol" : "Nofaol",
      ]),
    }),
  });
}

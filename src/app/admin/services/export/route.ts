import { parseExportFormat } from "@/data/api/mappers/export";
import { serviceListParams } from "@/data/api/mappers/clinic";
import { exportRoute } from "@/data/export";
import { filterServices } from "@/data/mock/clinic";
import { SERVICE_CATEGORY_LABEL } from "@/domain/clinic";
import { parseServiceQuery } from "@/features/admin/specialists/query";

/** Services export (contract §1.8 `xizmatlar`): the list's filters and ordering. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseServiceQuery(params);
  return exportRoute({
    resource: "services",
    name: "xizmatlar",
    format: parseExportFormat(params.format),
    apiParams: serviceListParams({ ...query, page: undefined, pageSize: undefined }),
    signal: request.signal,
    mock: async () => ({
      header: [
        "ID",
        "Nomi",
        "Qisqa nomi",
        "Kategoriya",
        "Davomiyligi (daq.)",
        "Narx (so‘m)",
        "Mutaxassislar",
        "Holat",
      ],
      rows: filterServices(query).map((s) => [
        Number(s.id),
        s.name.uz,
        s.shortName.uz,
        SERVICE_CATEGORY_LABEL[s.category],
        s.defaultDurationMin,
        s.defaultPrice ?? "",
        s.specialistCount,
        s.isActive ? "Faol" : "Nofaol",
      ]),
    }),
  });
}

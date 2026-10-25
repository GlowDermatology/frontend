import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { exportCategories } from "@/data/mock/categories.queries";

/** Categories export (contract §1.8 `kategoriyalar`). */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return exportRoute({
    resource: "categories",
    name: "kategoriyalar",
    format: parseExportFormat(params.format),
    apiParams: {},
    mock: async () => ({
      header: ["Slug", "Nomi", "Tartib", "Faol", "Mahsulotlar"],
      rows: (await exportCategories()).map((c) => [
        c.slug,
        c.name.uz,
        c.position,
        c.isActive,
        c.productCount,
      ]),
    }),
  });
}

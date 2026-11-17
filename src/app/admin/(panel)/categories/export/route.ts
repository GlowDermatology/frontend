import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { exportCategories } from "@/data/mock/categories.queries";
import { categoriesCopy } from "@/features/admin/categories/copy";
import { copyFor } from "@/lib/i18n/admin-locale";

/**
 * Categories export (contract §1.8 `kategoriyalar`). Api mode streams Django's file (headers in
 * the request language); the mock file takes its headers and words from the admin language.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return exportRoute({
    resource: "categories",
    name: "kategoriyalar",
    format: parseExportFormat(params.format),
    apiParams: {},
    signal: request.signal,
    mock: async () => {
      const [copy, categories] = await Promise.all([copyFor(categoriesCopy), exportCategories()]);
      return {
        header: [...copy.exports.header],
        rows: categories.map((c) => [
          c.slug,
          c.name.uz,
          c.position,
          c.isActive ? copy.exports.yes : copy.exports.no,
          c.productCount,
          c.imageUrl ?? "",
        ]),
      };
    },
  });
}

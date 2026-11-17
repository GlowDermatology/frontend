import { productFilterParams } from "@/data/api/mappers";
import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { getCategories } from "@/data/categories";
import { exportProducts } from "@/data/mock/products.queries";
import { categoryLabel } from "@/domain/category";
import { productDisplayName } from "@/domain/product";
import { productsCopy } from "@/features/admin/products/copy";
import { parseProductQuery, withKnownCategory } from "@/features/admin/products/query";
import { copyFor } from "@/lib/i18n/admin-locale";

/**
 * Products export (contract §1.8 `mahsulotlar`): streams
 * `GET products/?export=csv|xlsx` with the list's filters in api mode (headers in the request
 * language, from Django); builds the same CSV from the fixtures in mock mode, its headers and
 * words in the admin language.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseProductQuery(params);
  return exportRoute({
    resource: "products",
    name: "mahsulotlar",
    format: parseExportFormat(params.format),
    // An unknown category slug (a stale bookmark) is dropped, as on the board.
    apiParams: async () => productFilterParams(withKnownCategory(query, await getCategories())),
    signal: request.signal,
    mock: async () => {
      const [categories, copy] = await Promise.all([getCategories(), copyFor(productsCopy)]);
      const products = await exportProducts(withKnownCategory(query, categories));
      const yesNo = (value: boolean) => (value ? copy.exports.yes : copy.exports.no);
      return {
        header: [...copy.exports.header],
        rows: products.map((p) => [
          Number(p.id),
          p.billzId,
          p.billzName,
          productDisplayName(p),
          p.category ? categoryLabel(categories, p.category) : "",
          p.price,
          p.stock,
          yesNo(p.promo),
          copy.status[p.status],
          yesNo(p.isNewFromBillz),
        ]),
      };
    },
  });
}

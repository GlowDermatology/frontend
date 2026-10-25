import { productFilterParams } from "@/data/api/mappers";
import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { getCategories } from "@/data/categories";
import { exportProducts } from "@/data/mock/products.queries";
import { categoryLabel } from "@/domain/category";
import { productDisplayName } from "@/domain/product";
import { PRODUCT_STATUS_META } from "@/features/admin/products/labels";
import { parseProductQuery } from "@/features/admin/products/query";

/**
 * Products export (contract §1.8 `mahsulotlar`): streams
 * `GET products/?export=csv|xlsx` with the list's filters in api mode; builds
 * the same CSV from the fixtures in mock mode.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseProductQuery(params);
  return exportRoute({
    resource: "products",
    name: "mahsulotlar",
    format: parseExportFormat(params.format),
    apiParams: productFilterParams(query),
    mock: async () => {
      const [products, categories] = await Promise.all([exportProducts(query), getCategories()]);
      return {
        header: [
          "ID",
          "Billz ID",
          "Billz nomi",
          "Nomi",
          "Kategoriya",
          "Narx (so‘m)",
          "Qoldiq",
          "Aksiya",
          "Holat",
          "Yangi",
        ],
        rows: products.map((p) => [
          Number(p.id),
          p.billzId,
          p.billzName,
          productDisplayName(p),
          p.category ? categoryLabel(categories, p.category) : "",
          p.price,
          p.stock,
          p.promo,
          PRODUCT_STATUS_META[p.status].label,
          p.isNewFromBillz,
        ]),
      };
    },
  });
}

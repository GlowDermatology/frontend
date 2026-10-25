import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { exportBanners } from "@/data/mock/banners.queries";
import { BANNER_LINK_LABEL } from "@/domain/banner";

/** Banners export (contract §1.8 `bannerlar`). */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return exportRoute({
    resource: "banners",
    name: "bannerlar",
    format: parseExportFormat(params.format),
    apiParams: {},
    signal: request.signal,
    mock: async () => ({
      header: ["ID", "Sarlavha", "Havola", "Faol", "Boshlanishi", "Tugashi", "Tartib"],
      rows: (await exportBanners()).map((b) => [
        Number(b.id),
        b.title.uz,
        b.link.kind === "product"
          ? `${BANNER_LINK_LABEL.product} #${b.link.productId}`
          : b.link.kind === "category"
            ? `${BANNER_LINK_LABEL.category}: ${b.link.category}`
            : "",
        b.isActive,
        csvDateTime(b.startsAt),
        csvDateTime(b.endsAt),
        b.position,
      ]),
    }),
  });
}

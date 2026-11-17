import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { exportBanners } from "@/data/mock/banners.queries";
import { bannerLinkText } from "@/domain/banner";
import { bannersCopy } from "@/features/admin/banners/copy";
import { copyFor, getAdminLocale } from "@/lib/i18n/admin-locale";

/**
 * Banners export (contract §1.8 `bannerlar`). Api mode streams Django's file (headers in the
 * request language); the mock file takes its headers and words from the admin language.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return exportRoute({
    resource: "banners",
    name: "bannerlar",
    format: parseExportFormat(params.format),
    apiParams: {},
    signal: request.signal,
    mock: async () => {
      const [copy, locale, banners] = await Promise.all([
        copyFor(bannersCopy),
        getAdminLocale(),
        exportBanners(),
      ]);
      return {
        header: [...copy.exports.header],
        rows: banners.map((b) => [
          Number(b.id),
          b.title.uz,
          b.link.kind === "none" ? "" : bannerLinkText(b.link, locale),
          b.isActive ? copy.exports.yes : copy.exports.no,
          csvDateTime(b.startsAt),
          csvDateTime(b.endsAt),
          b.position,
        ]),
      };
    },
  });
}

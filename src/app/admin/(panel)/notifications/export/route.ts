import { parseExportFormat } from "@/data/api/mappers/export";
import { notificationListParams } from "@/data/api/mappers/notifications";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { exportNotifications } from "@/data/mock/notifications.queries";
import { notificationDataCopy } from "@/domain/copy/notifications";
import { audienceText } from "@/domain/notification";
import { notificationsCopy } from "@/features/admin/notifications/copy";
import { parseNotificationQuery } from "@/features/admin/notifications/query";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

/**
 * Notifications history export (contract §1.8 `bildirishnomalar`, gap
 * X-NOTIF-HISTORY): streams `GET notifications/?export=csv|xlsx` with the
 * history's state and kind filters in api mode (headers in the request
 * language); builds the same columns from the fixtures in mock mode, with
 * headers and words in the admin language.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseNotificationQuery(params);
  const filters = { state: query.state, kind: query.kind };
  return exportRoute({
    resource: "notifications",
    name: "bildirishnomalar",
    format: parseExportFormat(params.format),
    apiParams: notificationListParams(filters),
    signal: request.signal,
    mock: async () => {
      const locale = await getAdminLocale();
      const t = notificationsCopy[locale].exports;
      const words = notificationDataCopy[locale];
      return {
        header: [...t.header],
        rows: (await exportNotifications(filters)).map((n) => [
          n.id,
          csvDateTime(n.at),
          words.kind[n.kind],
          n.title,
          audienceText(n, locale),
          words.state[n.state],
          n.sent ?? "",
          n.delivered ?? "",
          n.linkUrl ?? (n.linkLabel ? t.product(n.linkLabel) : ""),
        ]),
      };
    },
  });
}

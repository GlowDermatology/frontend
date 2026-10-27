import { parseExportFormat } from "@/data/api/mappers/export";
import { notificationListParams } from "@/data/api/mappers/notifications";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { exportNotifications } from "@/data/mock/notifications.queries";
import { NOTIFICATION_KIND_LABEL, NOTIFICATION_STATE_LABEL } from "@/domain/notification";
import { parseNotificationQuery } from "@/features/admin/notifications/query";

/**
 * Notifications history export (contract §1.8 `bildirishnomalar`, gap
 * X-NOTIF-HISTORY): streams `GET notifications/?export=csv|xlsx` with the
 * history's state and kind filters in api mode; builds the same columns from
 * the fixtures in mock mode.
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
    mock: async () => ({
      header: [
        "ID",
        "Sana",
        "Turi",
        "Sarlavha",
        "Auditoriya",
        "Holat",
        "Yuborildi",
        "Yetkazildi",
        "Havola",
      ],
      rows: (await exportNotifications(filters)).map((n) => [
        n.id,
        csvDateTime(n.at),
        NOTIFICATION_KIND_LABEL[n.kind],
        n.title,
        n.audienceLabel,
        NOTIFICATION_STATE_LABEL[n.state],
        n.sent ?? "",
        n.delivered ?? "",
        n.linkUrl ?? (n.linkLabel ? `mahsulot: ${n.linkLabel}` : ""),
      ]),
    }),
  });
}

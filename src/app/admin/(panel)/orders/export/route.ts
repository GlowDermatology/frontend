import { parseExportFormat } from "@/data/api/mappers/export";
import { orderExportParams } from "@/data/api/mappers/orders";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { exportOrders } from "@/data/mock/orders.queries";
import { orderLabelsCopy } from "@/domain/copy/orders";
import { ordersCopy } from "@/features/admin/orders/copy";
import { customerName } from "@/features/admin/orders/labels";
import { parseOrderQuery } from "@/features/admin/orders/query";
import { PROVIDER_LABEL } from "@/features/admin/shared/status";
import { copyFor } from "@/lib/i18n/admin-locale";

/**
 * Orders export (contract §1.8 `buyurtmalar`): streams
 * `GET orders/?export=csv|xlsx` with the list's filters and ordering in api
 * mode (Django writes the headers in the request language); builds the same
 * CSV from the fixtures in mock mode, headers and words in the admin language.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseOrderQuery(params);
  return exportRoute({
    resource: "orders",
    name: "buyurtmalar",
    format: parseExportFormat(params.format),
    apiParams: orderExportParams(query),
    signal: request.signal,
    mock: async () => {
      const [t, labels, orders] = await Promise.all([
        copyFor(ordersCopy),
        copyFor(orderLabelsCopy),
        exportOrders(query),
      ]);
      return {
        header: [...t.exportHeader],
        rows: orders.map((o) => [
          o.id,
          customerName(o.customer.name, labels),
          o.customer.phone,
          csvDateTime(o.createdAt),
          o.total,
          labels.paymentStatus[o.payment.status],
          PROVIDER_LABEL[o.payment.provider],
          labels.fulfilment[o.fulfilment],
          labels.status[o.status],
          // A Yandex order's tracking number is the courier claim's id, not a BTS number.
          o.shipment.state === "created" && o.delivery?.provider !== "yandex"
            ? o.shipment.trackingNumber
            : "",
        ]),
      };
    },
  });
}

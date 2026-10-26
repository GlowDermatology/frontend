import { parseExportFormat } from "@/data/api/mappers/export";
import { orderExportParams } from "@/data/api/mappers/orders";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { exportOrders } from "@/data/mock/orders.queries";
import { parseOrderQuery } from "@/features/admin/orders/query";
import {
  FULFILMENT_LABEL,
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  PROVIDER_LABEL,
} from "@/features/admin/shared/status";

/**
 * Orders export (contract §1.8 `buyurtmalar`): streams
 * `GET orders/?export=csv|xlsx` with the list's filters and ordering in api
 * mode; builds the same CSV from the fixtures in mock mode.
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
    mock: async () => ({
      header: [
        "№",
        "Mijoz",
        "Telefon",
        "Sana",
        "Summa (so‘m)",
        "To‘lov",
        "Usul",
        "Olish usuli",
        "Holat",
        "BTS",
      ],
      rows: (await exportOrders(query)).map((o) => [
        o.id,
        o.customer.name,
        o.customer.phone,
        csvDateTime(o.createdAt),
        o.total,
        PAYMENT_STATUS_META[o.payment.status].label,
        PROVIDER_LABEL[o.payment.provider],
        FULFILMENT_LABEL[o.fulfilment],
        ORDER_STATUS_META[o.status].label,
        o.shipment.state === "created" ? o.shipment.trackingNumber : "",
      ]),
    }),
  });
}

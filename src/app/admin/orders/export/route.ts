import { exportOrders } from "@/data/orders";
import { parseOrderQuery } from "@/features/admin/orders/query";
import {
  FULFILMENT_LABEL,
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  PROVIDER_LABEL,
} from "@/features/admin/shared/status";
import { formatDateTimeShort } from "@/lib/format";

/** CSV export of the filtered orders list (opens in Excel; UTF-8 with BOM). */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const orders = await exportOrders(parseOrderQuery(params));
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const header = [
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
  ];
  const rows = orders.map((o) => [
    o.id,
    o.customer.name,
    o.customer.phone,
    formatDateTimeShort(o.createdAt),
    o.total,
    PAYMENT_STATUS_META[o.payment.status].label,
    PROVIDER_LABEL[o.payment.provider],
    FULFILMENT_LABEL[o.fulfilment],
    ORDER_STATUS_META[o.status].label,
    o.shipment.state === "created" ? o.shipment.trackingNumber : "",
  ]);
  const csv = "﻿" + [header, ...rows].map((row) => row.map(escape).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="buyurtmalar.csv"',
      "Cache-Control": "no-store",
    },
  });
}

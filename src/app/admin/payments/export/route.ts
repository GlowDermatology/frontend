import { parseExportFormat } from "@/data/api/mappers/export";
import { paymentFilterParams } from "@/data/api/mappers/payments";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { filterPayments } from "@/data/mock/payments.queries";
import { refundStateLine } from "@/domain/order";
import { parsePaymentQuery } from "@/features/admin/payments/query";
import { PAYMENT_STATUS_META, PROVIDER_LABEL } from "@/features/admin/shared/status";

/**
 * Payments export (contract §1.8 `tolovlar`) with the board's filters. The
 * screen-level "needs action" refund filter has no API equivalent (the API
 * filters one refund state at a time), so the board hides the export for it
 * and a hand-made URL gets a 400 instead of an unfiltered file.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parsePaymentQuery(params);
  return exportRoute({
    resource: "payments",
    name: "tolovlar",
    format: parseExportFormat(params.format),
    apiParams: paymentFilterParams(query),
    signal: request.signal,
    refusal:
      query.refund === "needs_action"
        ? { field: "refund", message: "Bu ko‘rinishni eksport qilib bo‘lmaydi." }
        : undefined,
    mock: async () => ({
      header: [
        "ID",
        "Buyurtma №",
        "Mijoz",
        "Telefon",
        "Usul",
        "Holat",
        "Summa (so‘m)",
        "Tranzaksiya",
        "Yaratilgan",
        "Tasdiqlangan",
        "Qaytarish",
      ],
      rows: filterPayments(query).map((p) => [
        p.id,
        p.orderId,
        p.customer.name,
        p.customer.phone,
        PROVIDER_LABEL[p.provider],
        PAYMENT_STATUS_META[p.status].label,
        p.amount,
        p.transactionId ?? "",
        csvDateTime(p.createdAt),
        csvDateTime(p.confirmedAt ?? null),
        p.refunds[0] ? refundStateLine(p.refunds[0]) : "",
      ]),
    }),
  });
}

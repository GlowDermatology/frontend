import { customerFilterParams } from "@/data/api/mappers/customers";
import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { exportCustomers } from "@/data/mock/customers.queries";
import { parseCustomerQuery } from "@/features/admin/customers/query";

/**
 * Customers export (contract §1.8 `mijozlar`): streams
 * `GET customers/?export=csv|xlsx` with the list's filters and ordering in
 * api mode; builds the same columns from the fixtures in mock mode.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseCustomerQuery(params);
  return exportRoute({
    resource: "customers",
    name: "mijozlar",
    format: parseExportFormat(params.format),
    apiParams: customerFilterParams(query),
    signal: request.signal,
    mock: async () => ({
      header: [
        "ID",
        "Ism",
        "Telefon",
        "Ro‘yxatdan o‘tgan",
        "Jami xaridlar (so‘m)",
        "Cashback foizi",
        "Balans (so‘m)",
        "Holat",
      ],
      rows: (await exportCustomers(query)).map((c) => [
        Number(c.id),
        c.status === "deleted" ? "" : c.name,
        c.phone,
        csvDateTime(c.registeredAt),
        c.lifetimeTotal,
        c.percent ?? "",
        c.balance,
        c.status === "active" ? "Faol" : "O‘chirilgan",
      ]),
    }),
  });
}

import { customerFilterParams } from "@/data/api/mappers/customers";
import { parseExportFormat } from "@/data/api/mappers/export";
import { exportRoute } from "@/data/export";
import { csvDateTime } from "@/data/export-csv";
import { exportCustomers } from "@/data/mock/customers.queries";
import { customerDataCopy } from "@/domain/copy/customers";
import { customersCopy } from "@/features/admin/customers/copy";
import { parseCustomerQuery } from "@/features/admin/customers/query";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

/**
 * Customers export (contract §1.8 `mijozlar`): streams
 * `GET customers/?export=csv|xlsx` with the list's filters and ordering in
 * api mode; builds the same columns from the fixtures in mock mode.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = parseCustomerQuery(params);
  // Api mode streams Django's file (headers in the request language); the mock file follows the
  // admin language.
  const locale = await getAdminLocale();
  return exportRoute({
    resource: "customers",
    name: "mijozlar",
    format: parseExportFormat(params.format),
    apiParams: customerFilterParams(query),
    signal: request.signal,
    mock: async () => ({
      header: [...customersCopy[locale].exportHeader],
      rows: (await exportCustomers(query)).map((c) => [
        Number(c.id),
        c.status === "deleted" ? "" : c.name,
        c.phone,
        csvDateTime(c.registeredAt),
        c.lifetimeTotal,
        c.percent ?? "",
        c.balance,
        customerDataCopy[locale].status[c.status],
      ]),
    }),
  });
}

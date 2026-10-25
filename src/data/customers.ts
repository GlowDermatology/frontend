import "server-only";

import type { Customer } from "@/domain/customer";

import * as mock from "./mock/customers.queries";
import { dataSource, notWiredYet } from "./source";

/**
 * Customers read seam. Dispatches on `dataSource()`: the mock body lives in
 * `./mock/customers.queries.ts`; the api branch is not wired yet (F2) and
 * returns `null` via `notWiredYet`.
 */

/** `GET /api/v1/admin/customers/{id}/` (ledger and purchases included); `null` on 404. */
export async function getCustomer(id: string): Promise<Customer | null> {
  if ((await dataSource()) === "api") return notWiredYet("customers", null);
  return mock.getCustomer(id);
}

import "server-only";

import type { Customer } from "@/domain/customer";

import { buildCustomer } from "./mock/customers";

/** `GET /api/v1/admin/customers/{id}/` (ledger and purchases included). */
export async function getCustomer(id: string): Promise<Customer | null> {
  return buildCustomer(id);
}

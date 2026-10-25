import type { Customer } from "@/domain/customer";

import { buildCustomer } from "./customers";

/** Mock implementation of `src/data/customers.ts`. */
export async function getCustomer(id: string): Promise<Customer | null> {
  return buildCustomer(id);
}

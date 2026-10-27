import "server-only";

import { cache } from "react";

import type { Customer, CustomerListItem, CustomerListQuery } from "@/domain/customer";

import { apiGetCustomer, apiListCustomers } from "./api/customers";
import { isApiError } from "./api/errors";
import { customerListParams, mapCustomerCard } from "./api/mappers/customers";
import { mapPage } from "./api/mappers/page";
import { mapSegmentMember } from "./api/mappers/segments";
import { requireApiToken } from "./auth";
import * as mock from "./mock/customers.queries";
import { dataSource } from "./source";
import type { Page } from "./types";

/**
 * Customers read seam (contract §2.6). Dispatches on `dataSource()`: the
 * mock bodies live in `./mock/customers.queries.ts`; the api branch reads
 * `GET customers/` and `GET customers/{id}/` through `./api/customers.ts`
 * and maps them with `./api/mappers/customers.ts`.
 */

/**
 * `GET /api/v1/admin/customers/?search=&status=&segment=&ordering=&page=&page_size=`
 * (pages of 20 or 50).
 */
export async function listCustomers(query: CustomerListQuery): Promise<Page<CustomerListItem>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListCustomers(token, customerListParams(query));
    return mapPage(data, mapSegmentMember);
  }
  return mock.listCustomers(query);
}

/**
 * `GET /api/v1/admin/customers/{id}/` (ledger and purchases included);
 * `null` on 404 or an id the API cannot have. Deduplicated per render with
 * React `cache()`, so `generateMetadata` and the page share one request.
 */
export const getCustomer = cache(async (id: string): Promise<Customer | null> => {
  if ((await dataSource()) === "api") {
    if (!/^\d{1,18}$/.test(id)) return null;
    const token = await requireApiToken();
    try {
      return mapCustomerCard((await apiGetCustomer(token, id)).data);
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  }
  return mock.getCustomer(id);
});

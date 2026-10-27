import "server-only";

import { cache } from "react";

import {
  CUSTOMER_SESSIONS_PAGE_SIZE,
  type Customer,
  type CustomerListItem,
  type CustomerListQuery,
  type CustomerSession,
} from "@/domain/customer";

import { apiGetCustomer, apiListCustomers, apiListCustomerSessions } from "./api/customers";
import { isApiError } from "./api/errors";
import { customerListParams, mapCustomerCard, mapCustomerSession } from "./api/mappers/customers";
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

/**
 * `GET /api/v1/admin/customers/{id}/sessions/?page=&page_size=20` (B-W1):
 * the customer's open sessions, most recently active first; `null` on 404.
 * The server clamps `page` (§1.5), so a page emptied by sign-outs comes back
 * as the last one.
 */
export async function listCustomerSessions(
  id: string,
  page = 1,
  token?: string,
): Promise<Page<CustomerSession> | null> {
  if ((await dataSource()) === "api") {
    if (!/^\d{1,18}$/.test(id)) return null;
    const bearer = token ?? (await requireApiToken());
    try {
      const { data } = await apiListCustomerSessions(bearer, id, {
        page: page > 1 ? page : undefined,
        page_size: CUSTOMER_SESSIONS_PAGE_SIZE,
      });
      return mapPage(data, mapCustomerSession);
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  }
  return mock.listCustomerSessions(id, page, CUSTOMER_SESSIONS_PAGE_SIZE);
}

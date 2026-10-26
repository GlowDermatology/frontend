import "server-only";

import { cache } from "react";

import type {
  FulfilmentMethod,
  Order,
  OrderStatus,
  OrderSummary,
  PaymentStatus,
} from "@/domain/order";

import { apiGetOrder, apiListOrders, apiOrderStatusCounts } from "./api/orders";
import { isApiError } from "./api/errors";
import { optimizableMediaUrl } from "./api/media";
import { mapPage } from "./api/mappers/page";
import {
  mapOrder,
  mapOrderSummary,
  orderFilterParams,
  orderListParams,
} from "./api/mappers/orders";
import { requireApiToken } from "./auth";
import * as mock from "./mock/orders.queries";
import { dataSource } from "./source";
import type { Page } from "./types";

/**
 * Orders read seam (contract §2.2). Every function dispatches on
 * `dataSource()`: the mock branch lives in `./mock/orders.queries.ts`; the
 * api branch calls `orders/`, `orders/status-counts/` and `orders/{id}/`
 * through `./api/orders.ts` and maps the answers with
 * `./api/mappers/orders.ts`.
 */

export type OrderPeriod = "today" | "week" | "month" | "all";
export type OrderSort = "date_desc" | "date_asc";

export interface OrderFilters {
  q?: string;
  fulfilment?: FulfilmentMethod;
  payment?: PaymentStatus;
  /** `today` = the Tashkent day, `week` = rolling 7×24 h, `month` = calendar month to date. */
  period: OrderPeriod;
  /** Inclusive Tashkent days on `created_at` (`YYYY-MM-DD`), ANDed with `period`. */
  dateFrom?: string;
  dateTo?: string;
  /** Customer id (the customer card links here). */
  customer?: string;
}

export interface OrderListQuery extends OrderFilters {
  status?: OrderStatus;
  page: number;
  pageSize: number;
  sort: OrderSort;
}

/** `GET /api/v1/admin/orders/?status=&search=&fulfilment=&payment=&period=&date_from=&date_to=&customer=&ordering=&page=&page_size=` */
export async function listOrders(query: OrderListQuery): Promise<Page<OrderSummary>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListOrders(token, orderListParams(query));
    return mapPage(data, mapOrderSummary);
  }
  return mock.listOrders(query);
}

/** `GET orders/status-counts/`: tab counts for the same filters (status excluded). */
export async function getOrderStatusCounts(
  filters: OrderFilters,
): Promise<Record<OrderStatus | "all", number>> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiOrderStatusCounts(token, orderFilterParams(filters));
    return data;
  }
  return mock.getOrderStatusCounts(filters);
}

/**
 * `GET /api/v1/admin/orders/{id}/` — `null` for an unknown id (404). Wrapped
 * in `cache()` (and `cachedGet` below it), so `generateMetadata` and the page
 * body read the order once per request.
 */
export const getOrder = cache(async (id: number): Promise<Order | null> => {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    try {
      return mapOrder((await apiGetOrder(token, id)).data, { imageUrl: optimizableMediaUrl });
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  }
  return mock.getOrder(id);
});

/** Newest orders for the dashboard (`orders/?page_size=6`, contract §5.7). */
export async function getRecentOrders(limit: 6): Promise<OrderSummary[]> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    const { data } = await apiListOrders(token, { page_size: limit });
    return data.results.map(mapOrderSummary);
  }
  return mock.getRecentOrders(limit);
}

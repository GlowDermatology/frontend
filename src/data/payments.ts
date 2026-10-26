import "server-only";

import { REFUND_STATES_NEEDING_ACTION } from "@/domain/order";
import type { PaymentListQuery, PaymentRecord } from "@/domain/payment";

import { apiListPayments } from "./api/orders";
import { mapPage } from "./api/mappers/page";
import { mapPayment, paymentFilterParams, paymentListParams } from "./api/mappers/payments";
import { collectAllPages } from "./api/pages";
import { requireApiToken } from "./auth";
import * as mock from "./mock/payments.queries";
import { dataSource } from "./source";
import { paginate, type Page } from "./types";

/**
 * Payments read seam (contract §2.12). The mock branch lives in
 * `./mock/payments.queries.ts`; the api branch calls `payments/` through
 * `./api/orders.ts`.
 *
 * The board's "Harakat kerak" refund filter (`needs_action`) is the
 * dashboard's `refunds_needing_action`: any refund in failed, unknown or
 * manual_required. The API filters one `refund_state` at a time, so this
 * view reads the three filtered lists whole (bounded by `collectAllPages`:
 * an action queue, not the payment history), merges them newest first
 * without duplicates and pages locally.
 */

const NEEDS_ACTION_PAGE_SIZE = 50;

/** `GET /api/v1/admin/payments/?status=&provider=&refund_state=&period=&date_from=&date_to=&search=&ordering=&page=&page_size=` */
export async function listPayments(query: PaymentListQuery): Promise<Page<PaymentRecord>> {
  if ((await dataSource()) !== "api") return mock.listPayments(query);
  const token = await requireApiToken();
  if (query.refund !== "needs_action") {
    const { data } = await apiListPayments(token, paymentListParams(query));
    return mapPage(data, mapPayment);
  }
  const base = paymentFilterParams({ ...query, refund: undefined });
  const lists = await Promise.all(
    REFUND_STATES_NEEDING_ACTION.map((state) =>
      collectAllPages(
        async (page) =>
          (
            await apiListPayments(token, {
              ...base,
              refund_state: state,
              page,
              page_size: NEEDS_ACTION_PAGE_SIZE,
            })
          ).data,
        { pageSize: NEEDS_ACTION_PAGE_SIZE, path: "payments/" },
      ),
    ),
  );
  const byId = new Map<number, PaymentRecord>();
  for (const row of lists.flat()) if (!byId.has(row.id)) byId.set(row.id, mapPayment(row));
  const direction = query.sort === "date_asc" ? 1 : -1;
  const merged = [...byId.values()].sort(
    (a, b) =>
      direction * (Date.parse(a.createdAt) - Date.parse(b.createdAt)) || direction * (a.id - b.id),
  );
  return paginate(merged, query.page, query.pageSize);
}

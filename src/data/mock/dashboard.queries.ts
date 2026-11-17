import type { DashboardData, DashboardQuery, DashboardRange } from "@/domain/dashboard";
import type { Locale } from "@/lib/i18n/locales";
import { customBucket, rangeDays } from "@/domain/dashboard";
import { refundNeedsAction } from "@/domain/payment";
import { addDays, startOfLocalDay, toLocalIsoDate } from "@/lib/format";

import { mapDashboard } from "../api/mappers/dashboard";
import type { ApiDashboard, ApiDashboardBucket } from "../api/types";
import { referenceNow } from "../config";
import { getPendingAppointments } from "./appointments.queries";
import { CUSTOMER_TOTALS, DASHBOARD_SERIES } from "./dashboard";
import { countFailedShipments, getFulfilmentCounts } from "./orders.queries";
import { isLateCapture, ORDER_SUMMARIES } from "./orders";
import { PAYMENTS } from "./payments";
import { getCatalogStats } from "./products.queries";

/**
 * Mock implementation of `src/data/dashboard.ts`. The presets show the
 * design's chart series; a custom range is computed from the order and
 * payment fixtures. Both are mapped by the same `mapDashboard` as the API
 * answer, so labels, notes and windows follow §5.7 in both modes and in the
 * admin language. The attention counters come from the other fixtures.
 */

/** Demo value of `attention.bts_polling_failing` (M2): on, so the item can be seen. */
export const MOCK_BTS_POLLING_FAILING = true;

/**
 * Demo value of `attention.yandex_failing` (Yandex Delivery plan §3.9): off,
 * as the backend reports in fake mode (the item is covered by unit tests).
 */
export const MOCK_YANDEX_FAILING = false;

const SPAN_DAYS: Record<DashboardRange, number> = { today: 1, week: 7, month: 30 };
/** New registrations per day implied by the month fixture (402 in 30 days). */
const NEW_CUSTOMERS_PER_DAY = 402 / 30;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function bucketsFor(from: string, to: string): ApiDashboardBucket[] {
  const bucket = customBucket(from, to);
  const start = startOfLocalDay(from).getTime();
  const end = startOfLocalDay(addDays(to, 1)).getTime();
  const step = bucket === "hour" ? HOUR : DAY;
  const buckets: ApiDashboardBucket[] = [];
  for (let t = start; t < end; t += step) {
    const inBucket = (iso: string | undefined) => {
      if (!iso) return false;
      const ms = Date.parse(iso);
      return ms >= t && ms < t + step;
    };
    const orders = ORDER_SUMMARIES.filter((o) => inBucket(o.createdAt)).length;
    // Late captures are money we did not honour (always refunded): never revenue (§2.10, M2).
    const revenue = PAYMENTS.filter(
      (p) => inBucket(p.confirmedAt) && p.status === "paid" && !isLateCapture({ id: p.orderId }),
    ).reduce((sum, p) => sum + p.amount, 0);
    buckets.push({
      start: `${new Date(t + 5 * HOUR).toISOString().slice(0, 19)}+05:00`,
      orders,
      revenue,
    });
  }
  return buckets;
}

function countOrdersBetween(from: string, to: string): number {
  return ORDER_SUMMARIES.filter((o) => {
    const day = toLocalIsoDate(o.createdAt);
    return day >= from && day <= to;
  }).length;
}

export async function getDashboard(
  query: DashboardQuery,
  locale: Locale = "uz",
): Promise<DashboardData> {
  const [catalog, pending, btsFailed, fulfilment] = await Promise.all([
    getCatalogStats(),
    getPendingAppointments(),
    countFailedShipments(),
    getFulfilmentCounts(),
  ]);
  const attention: DashboardData["attention"] = {
    btsFailed,
    pendingAppointments: pending.count,
    nextAppointmentAt: pending.nextAt,
    newFromBillz: catalog.newFromBillz,
    refundsNeedingAction: PAYMENTS.reduce(
      (count, p) => count + p.refunds.filter((r) => refundNeedsAction(r, p)).length,
      0,
    ),
    // The demo's BTS tracking is down, so the attention block shows that item too.
    btsPollingFailing: MOCK_BTS_POLLING_FAILING,
    // The demo has a cashback policy in force (`MOCK_POLICY`).
    cashbackPolicyMissing: false,
    yandexFailing: MOCK_YANDEX_FAILING,
  };
  const today = toLocalIsoDate(referenceNow());

  const range: DashboardRange | "custom" = query.range;
  let from: string;
  let to: string;
  let buckets: ApiDashboardBucket[];
  let previousOrders: number;
  let newCustomers: number;
  if (query.range === "custom") {
    const days = rangeDays(query.from, query.to);
    from = query.from;
    to = query.to;
    buckets = bucketsFor(query.from, query.to);
    previousOrders = countOrdersBetween(addDays(query.from, -days), addDays(query.from, -1));
    newCustomers = Math.round(days * NEW_CUSTOMERS_PER_DAY);
  } else {
    const fixture = DASHBOARD_SERIES[query.range];
    from = addDays(today, 1 - SPAN_DAYS[query.range]);
    to = today;
    buckets = fixture.buckets;
    previousOrders = fixture.previousOrders;
    newCustomers = fixture.newCustomers;
  }
  const api: ApiDashboard = {
    range,
    from,
    to,
    bucket:
      query.range === "custom" ? customBucket(from, to) : query.range === "today" ? "hour" : "day",
    buckets,
    previous_period_orders: previousOrders,
    stats: {
      orders: buckets.reduce((sum, b) => sum + b.orders, 0),
      revenue: buckets.reduce((sum, b) => sum + b.revenue, 0),
      new_customers: newCustomers,
      total_customers: CUSTOMER_TOTALS.total,
      deleted_customers: CUSTOMER_TOTALS.deleted,
      out_of_stock: catalog.outOfStock,
    },
    attention: {
      bts_failed: attention.btsFailed,
      pending_appointments: attention.pendingAppointments,
      next_appointment_at: attention.nextAppointmentAt,
      new_from_billz: attention.newFromBillz,
      refunds_needing_action: attention.refundsNeedingAction,
      bts_polling_failing: attention.btsPollingFailing,
      cashback_policy_missing: attention.cashbackPolicyMissing,
      yandex_failing: attention.yandexFailing,
    },
    fulfilment: {
      paid_to_prepare: fulfilment.paidToPrepare,
      to_hand_to_courier: fulfilment.toHandToCourier,
      in_delivery: fulfilment.inDelivery,
      returning: fulfilment.returning,
      completed_today: fulfilment.completedToday,
      needs_action: fulfilment.needsAction,
      urgent: fulfilment.urgent,
    },
    generated_at: referenceNow().toISOString(),
  };
  return mapDashboard(api, locale);
}

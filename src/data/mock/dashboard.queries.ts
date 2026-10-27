import type { DashboardData, DashboardQuery, DashboardRange } from "@/domain/dashboard";
import { customBucket, rangeDays } from "@/domain/dashboard";
import { refundNeedsAction } from "@/domain/payment";
import { addDays, startOfLocalDay, toLocalIsoDate } from "@/lib/format";

import { mapDashboard } from "../api/mappers/dashboard";
import type { ApiDashboard, ApiDashboardBucket } from "../api/types";
import { referenceNow } from "../config";
import { getPendingAppointments } from "./appointments.queries";
import { CUSTOMER_TOTALS, DASHBOARD_SERIES } from "./dashboard";
import { countFailedShipments } from "./orders.queries";
import { isLateCapture, ORDER_SUMMARIES } from "./orders";
import { PAYMENTS } from "./payments";
import { getCatalogStats } from "./products.queries";

/**
 * Mock implementation of `src/data/dashboard.ts`. The presets show the
 * design's chart series; a custom range is computed from the order and
 * payment fixtures and mapped by the same `mapDashboard` as the API answer,
 * so labels and windows follow §5.7 in both modes. The attention counters
 * come from the other fixtures.
 */

/** Demo value of `attention.bts_polling_failing` (M2): on, so the item can be seen. */
export const MOCK_BTS_POLLING_FAILING = true;

const PREVIOUS_ORDERS: Record<DashboardRange, number> = { today: 41, week: 212, month: 905 };
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

export async function getDashboard(query: DashboardQuery): Promise<DashboardData> {
  const [catalog, pending, btsFailed] = await Promise.all([
    getCatalogStats(),
    getPendingAppointments(),
    countFailedShipments(),
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
  };
  const today = toLocalIsoDate(referenceNow());

  if (query.range === "custom") {
    const days = rangeDays(query.from, query.to);
    const buckets = bucketsFor(query.from, query.to);
    const api: ApiDashboard = {
      range: "custom",
      from: query.from,
      to: query.to,
      bucket: customBucket(query.from, query.to),
      buckets,
      previous_period_orders: countOrdersBetween(
        addDays(query.from, -days),
        addDays(query.from, -1),
      ),
      stats: {
        orders: buckets.reduce((sum, b) => sum + b.orders, 0),
        revenue: buckets.reduce((sum, b) => sum + b.revenue, 0),
        new_customers: Math.round(days * NEW_CUSTOMERS_PER_DAY),
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
      },
      generated_at: referenceNow().toISOString(),
    };
    return mapDashboard(api);
  }

  const fixture = DASHBOARD_SERIES[query.range];
  return {
    range: query.range,
    from: addDays(today, 1 - SPAN_DAYS[query.range]),
    to: today,
    bucket: query.range === "today" ? "hour" : "day",
    axisNote: fixture.axisNote,
    axisLabels: fixture.axisLabels,
    series: fixture.series,
    previousPeriodOrders: PREVIOUS_ORDERS[query.range],
    stats: {
      orders: fixture.series.reduce((sum, p) => sum + p.orders, 0),
      revenue: fixture.series.reduce((sum, p) => sum + p.revenue, 0),
      newCustomers: fixture.newCustomers,
      ordersNote: fixture.ordersNote,
      totalCustomers: CUSTOMER_TOTALS.total,
      deletedCustomers: CUSTOMER_TOTALS.deleted,
      outOfStock: catalog.outOfStock,
    },
    attention,
  };
}

import type { DashboardData, DashboardQuery, SeriesPoint } from "@/domain/dashboard";
import {
  formatDayMonthShort,
  formatTime,
  tashkentParts,
  toLocalIsoDate,
  WEEKDAYS_SHORT,
} from "@/lib/format";

import type { QueryValue } from "../client";
import type { ApiDashboard, ApiDashboardBucket } from "../types";

/**
 * Dashboard: the screen's query → `dashboard/?range=&from=&to=` and the
 * answer → `DashboardData` (contract §2.10, §5.7).
 */

export function dashboardParams(query: DashboardQuery): Record<string, QueryValue> {
  return query.range === "custom"
    ? { range: "custom", from: query.from, to: query.to }
    : { range: query.range };
}

const AXIS_NOTE = { hour: "Soatlar bo‘yicha", day: "Kunlar bo‘yicha" } as const;

const ORDERS_NOTE: Record<DashboardData["range"], (n: number) => string> = {
  today: (n) => `Kecha: ${n} ta`,
  week: (n) => `O‘tgan hafta: ${n} ta`,
  month: (n) => `O‘tgan oy: ${n} ta`,
  custom: (n) => `Oldingi davr: ${n} ta`,
};

const empty = (b: ApiDashboardBucket) => b.orders === 0 && b.revenue === 0;

/**
 * Hour buckets of one day keep the window `[min(09:00, first non-empty),
 * max(21:00, last non-empty)]` (13 buckets when nothing falls outside); day
 * buckets and multi-day hour buckets are kept whole.
 */
export function windowBuckets(
  buckets: ReadonlyArray<ApiDashboardBucket>,
  bucket: ApiDashboard["bucket"],
): ApiDashboardBucket[] {
  if (bucket !== "hour" || buckets.length === 0) return [...buckets];
  const days = new Set(buckets.map((b) => toLocalIsoDate(b.start)));
  if (days.size > 1) return [...buckets];
  const hour = (b: ApiDashboardBucket) => tashkentParts(b.start).hours;
  const nonEmpty = buckets.filter((b) => !empty(b));
  const first = Math.min(9, ...nonEmpty.map(hour));
  const last = Math.max(21, ...nonEmpty.map(hour));
  return buckets.filter((b) => hour(b) >= first && hour(b) <= last);
}

export function mapDashboard(api: ApiDashboard): DashboardData {
  const window = windowBuckets(api.buckets, api.bucket);
  const multiDayHours =
    api.bucket === "hour" && new Set(window.map((b) => toLocalIsoDate(b.start))).size > 1;
  const label = (b: ApiDashboardBucket): string => {
    if (api.bucket === "hour") {
      // Two-day custom ranges repeat the hours, so the day goes in front.
      return multiDayHours
        ? `${formatDayMonthShort(b.start)}, ${formatTime(b.start)}`
        : formatTime(b.start);
    }
    if (api.range === "week") {
      return `${WEEKDAYS_SHORT[tashkentParts(b.start).weekday]}, ${formatDayMonthShort(b.start)}`;
    }
    return formatDayMonthShort(b.start);
  };
  const series: SeriesPoint[] = window.map((b) => ({
    label: label(b),
    revenue: b.revenue,
    orders: b.orders,
  }));
  const n = window.length;
  const axis = (b: ApiDashboardBucket | undefined): string =>
    !b ? "" : api.bucket === "hour" ? label(b) : formatDayMonthShort(b.start);

  return {
    range: api.range,
    from: api.from,
    to: api.to,
    bucket: api.bucket,
    axisNote: AXIS_NOTE[api.bucket],
    axisLabels: [axis(window[0]), axis(window[Math.floor((n - 1) / 2)]), axis(window[n - 1])],
    series,
    previousPeriodOrders: api.previous_period_orders,
    stats: {
      orders: api.stats.orders,
      revenue: api.stats.revenue,
      newCustomers: api.stats.new_customers,
      ordersNote: ORDERS_NOTE[api.range](api.previous_period_orders),
      totalCustomers: api.stats.total_customers,
      deletedCustomers: api.stats.deleted_customers,
      outOfStock: api.stats.out_of_stock,
    },
    attention: {
      btsFailed: api.attention.bts_failed,
      pendingAppointments: api.attention.pending_appointments,
      nextAppointmentAt: api.attention.next_appointment_at,
      newFromBillz: api.attention.new_from_billz,
      refundsNeedingAction: api.attention.refunds_needing_action,
      btsPollingFailing: api.attention.bts_polling_failing,
      cashbackPolicyMissing: api.attention.cashback_policy_missing ?? false,
    },
  };
}

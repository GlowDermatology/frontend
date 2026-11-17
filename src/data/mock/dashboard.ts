import type { DashboardRange } from "@/domain/dashboard";
import { addDays } from "@/lib/format";

import type { ApiDashboardBucket } from "../api/types";

/**
 * Chart series from the dashboard design (revenue in thousands of so‘m in the
 * source, stored here in so‘m), as the API's buckets: the demo's "today" is
 * 24 October 2026 (`DEMO_NOW`), so the hours run 09:00–21:00 that day, the
 * week 18–24 October and the month 25 September – 24 October. They go
 * through the same `mapDashboard` as an API answer, so labels and notes are
 * in the admin language.
 */

const DEMO_DAY = "2026-10-24";
const WEEK_REVENUE = [8640, 9320, 10150, 9870, 11240, 13060, 12480];
const WEEK_ORDERS = [27, 29, 31, 30, 34, 41, 38];

const at = (day: string, hour = 0) => `${day}T${String(hour).padStart(2, "0")}:00:00+05:00`;

function today(): ApiDashboardBucket[] {
  const revenue = [180, 420, 760, 1120, 1340, 980, 1210, 1460, 1680, 1390, 1050, 610, 280];
  const orders = [1, 2, 3, 4, 4, 3, 4, 4, 5, 4, 2, 1, 1];
  return revenue.map((r, i) => ({
    start: at(DEMO_DAY, 9 + i),
    revenue: r * 1000,
    orders: orders[i] ?? 0,
  }));
}

function week(): ApiDashboardBucket[] {
  return WEEK_ORDERS.map((orders, i) => ({
    start: at(addDays(DEMO_DAY, i - 6)),
    revenue: (WEEK_REVENUE[i] ?? 0) * 1000,
    orders,
  }));
}

function month(): ApiDashboardBucket[] {
  const orders: number[] = [];
  const revenue: number[] = [];
  for (let i = 0; i < 23; i++) {
    const o = Math.round(24 + 6 * Math.sin(i * 0.7) + i * 0.35 + (i % 7 === 5 ? 6 : 0));
    orders.push(o);
    revenue.push(Math.round((o * (300 + 40 * Math.sin(i * 1.3))) / 10) * 10);
  }
  const allOrders = [...orders, ...WEEK_ORDERS];
  const allRevenue = [...revenue, ...WEEK_REVENUE];
  return allOrders.map((o, i) => ({
    start: at(addDays(DEMO_DAY, i - (allOrders.length - 1))),
    revenue: (allRevenue[i] ?? 0) * 1000,
    orders: o,
  }));
}

export const DASHBOARD_SERIES: Record<
  DashboardRange,
  { buckets: ApiDashboardBucket[]; newCustomers: number; previousOrders: number }
> = {
  today: { buckets: today(), newCustomers: 14, previousOrders: 41 },
  week: { buckets: week(), newCustomers: 96, previousOrders: 212 },
  month: { buckets: month(), newCustomers: 402, previousOrders: 905 },
};

export const CUSTOMER_TOTALS = { total: 4812, deleted: 61 };

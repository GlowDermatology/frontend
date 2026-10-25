import type { DashboardData, DashboardRange } from "@/domain/dashboard";

import { getPendingAppointments } from "./appointments.queries";
import { CUSTOMER_TOTALS, DASHBOARD_SERIES } from "./dashboard";
import { countFailedShipments } from "./orders.queries";
import { getCatalogStats } from "./products.queries";

/**
 * Mock implementation of `src/data/dashboard.ts`: the design's chart series
 * plus the attention counters derived from the other fixtures.
 */
export async function getDashboard(range: DashboardRange): Promise<DashboardData> {
  const fixture = DASHBOARD_SERIES[range];
  const [catalog, pending, btsFailed] = await Promise.all([
    getCatalogStats(),
    getPendingAppointments(),
    countFailedShipments(),
  ]);
  return {
    range,
    axisNote: fixture.axisNote,
    axisLabels: fixture.axisLabels,
    series: fixture.series,
    stats: {
      newCustomers: fixture.newCustomers,
      ordersNote: fixture.ordersNote,
      totalCustomers: CUSTOMER_TOTALS.total,
      deletedCustomers: CUSTOMER_TOTALS.deleted,
      outOfStock: catalog.outOfStock,
    },
    attention: {
      btsFailed,
      pendingAppointments: pending.count,
      nextAppointmentAt: pending.nextAt,
      newFromBillz: catalog.newFromBillz,
    },
  };
}

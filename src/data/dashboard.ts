import "server-only";

import type { DashboardData, DashboardRange } from "@/domain/dashboard";

import { getPendingAppointments } from "./appointments";
import { CUSTOMER_TOTALS, DASHBOARD_SERIES } from "./mock/dashboard";
import { countFailedShipments } from "./orders";
import { getCatalogStats } from "./products";

/** `GET /api/v1/admin/dashboard/?range=today|week|month` */
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

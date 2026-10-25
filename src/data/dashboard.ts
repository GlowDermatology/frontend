import "server-only";

import type { DashboardData, DashboardRange } from "@/domain/dashboard";

import * as mock from "./mock/dashboard.queries";
import { dataSource, notWiredYet } from "./source";

/**
 * Dashboard read seam. Dispatches on `dataSource()`: the mock body lives in
 * `./mock/dashboard.queries.ts`; the api branch is not wired yet (F2) and
 * returns zero buckets and zero stats via `notWiredYet`.
 */

/** `GET /api/v1/admin/dashboard/?range=today|week|month` */
export async function getDashboard(range: DashboardRange): Promise<DashboardData> {
  if ((await dataSource()) === "api") {
    return notWiredYet("dashboard", {
      range,
      axisNote: "",
      axisLabels: ["", "", ""],
      series: [],
      stats: {
        newCustomers: 0,
        ordersNote: "",
        totalCustomers: 0,
        deletedCustomers: 0,
        outOfStock: 0,
      },
      attention: {
        btsFailed: 0,
        pendingAppointments: 0,
        nextAppointmentAt: null,
        newFromBillz: 0,
      },
    });
  }
  return mock.getDashboard(range);
}

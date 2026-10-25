import "server-only";

import { cache } from "react";

import { apiNavCounts } from "./api/admin";
import { isApiError } from "./api/errors";
import { verifyStaff } from "./auth";
import { getPendingAppointments } from "./appointments";
import { getOrderStatusCounts } from "./orders";
import { dataSource } from "./source";

/**
 * Shell read seam (contract §2.10 `nav-counts/`, §5.7 sidebar badges).
 */

export interface NavCounts {
  /** All-time `processing` orders. */
  ordersProcessing: number;
  /** Requests still ahead (= the pending summary's count). */
  appointmentsPending: number;
}

/**
 * The sidebar pills, fetched once per request (React `cache()`: the desktop
 * sidebar and the mobile drawer render the same counts from one call) and
 * re-read with the route refresh that follows every api-mode action. The
 * pills are decorative and sit on every page, so a missing session or an
 * API failure gives `null` (no pills) instead of redirecting from the
 * sidebar or escaping to the error boundary.
 */
export const getNavCounts = cache(async (): Promise<NavCounts | null> => {
  if ((await dataSource()) === "api") {
    const session = await verifyStaff();
    if (!session.ok || session.mode !== "api") return null;
    try {
      const { data } = await apiNavCounts(session.token);
      return {
        ordersProcessing: data.orders_processing,
        appointmentsPending: data.appointments_pending,
      };
    } catch (error) {
      if (isApiError(error)) return null;
      throw error;
    }
  }
  const [orders, pending] = await Promise.all([
    getOrderStatusCounts({ period: "all" }),
    getPendingAppointments(),
  ]);
  return { ordersProcessing: orders.processing, appointmentsPending: pending.count };
});

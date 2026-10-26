import "server-only";

import type { CustomRangeErrors, DashboardData, DashboardQuery } from "@/domain/dashboard";

import { apiDashboard } from "./api/orders";
import { isApiError } from "./api/errors";
import { dashboardParams, mapDashboard } from "./api/mappers/dashboard";
import { requireApiToken } from "./auth";
import * as mock from "./mock/dashboard.queries";
import { dataSource } from "./source";

/**
 * Dashboard read seam (contract §2.10, §5.7). The mock body lives in
 * `./mock/dashboard.queries.ts`; the api branch calls
 * `dashboard/?range=today|week|month|custom&from=&to=` and maps the buckets.
 *
 * The screen validates a custom range before asking (same rules as the
 * backend), but the API stays the authority: its 400 on `from` / `to`
 * (e.g. "today" moved on between the check and the call) comes back as
 * field errors for the range picker instead of an error page.
 */

export type DashboardResult =
  { ok: true; data: DashboardData } | { ok: false; errors: CustomRangeErrors };

/** `GET /api/v1/admin/dashboard/?range=&from=&to=` */
export async function getDashboard(query: DashboardQuery): Promise<DashboardResult> {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    try {
      return {
        ok: true,
        data: mapDashboard((await apiDashboard(token, dashboardParams(query))).data),
      };
    } catch (error) {
      if (isApiError(error) && error.status === 400 && error.code === "validation_error") {
        const errors: CustomRangeErrors = {};
        for (const item of error.body.errors) {
          if (item.field === "from" || item.field === "to") errors[item.field] ??= item.message;
        }
        if (Object.keys(errors).length > 0) return { ok: false, errors };
      }
      throw error;
    }
  }
  return { ok: true, data: await mock.getDashboard(query) };
}

import "server-only";

import type { Job } from "@/domain/job";

import { apiGetJob } from "./api/catalog";
import { isApiError } from "./api/errors";
import { mapJob } from "./api/mappers";
import * as mock from "./mock/jobs.queries";
import { dataSource } from "./source";

/**
 * Jobs read seam (contract §2.14). `getJob` is polled by the Billz import
 * control through the `pollJob` Server Action, so it takes the token of the
 * already-guarded session instead of verifying it again.
 */

/** `GET /api/v1/admin/jobs/{id}/` — `null` for an unknown id (404). */
export async function getJob(id: string, token: string | null): Promise<Job | null> {
  if ((await dataSource()) === "api") {
    if (!token || !/^\d{1,18}$/.test(id)) return null;
    try {
      return mapJob((await apiGetJob(token, id)).data);
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  }
  return mock.getJob(id);
}

import "server-only";

import { cache } from "react";

import type { CashbackPolicy, PolicyVersion } from "@/domain/cashback";

import { apiCashbackPolicy } from "./api/customers";
import { mapCashbackSettings } from "./api/mappers/cashback";
import { requireApiToken } from "./auth";
import * as mock from "./mock/cashback.queries";
import { dataSource } from "./source";

/**
 * Cashback policy read seam (contract §2.7). Dispatches on `dataSource()`:
 * the mock body lives in `./mock/cashback.queries.ts`; the api branch reads
 * `GET cashback/policy/` and maps it with `./api/mappers/cashback.ts`.
 */

export interface CashbackSettings {
  /** The version in force now (an empty v0 when the backend has none yet). */
  policy: CashbackPolicy;
  /** A saved version that has not taken effect yet (at most one). */
  scheduled: CashbackPolicy | null;
  /** Every version, newest first, superseded ones included. */
  versions: ReadonlyArray<PolicyVersion>;
  /** When a newly saved version would take effect (start of the next Tashkent month). */
  nextEffectiveFrom: string;
}

/** `GET /api/v1/admin/cashback/policy/` (deduplicated per render). */
export const getCashbackSettings = cache(async (): Promise<CashbackSettings> => {
  if ((await dataSource()) === "api") {
    const token = await requireApiToken();
    return mapCashbackSettings((await apiCashbackPolicy(token)).data);
  }
  return mock.getCashbackSettings();
});

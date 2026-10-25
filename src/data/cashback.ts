import "server-only";

import type { CashbackPolicy, PolicyVersion } from "@/domain/cashback";
import { tashkentParts } from "@/lib/format";

import * as mock from "./mock/cashback.queries";
import { requestNow } from "./now";
import { dataSource, notWiredYet } from "./source";

/**
 * Cashback policy read seam. Dispatches on `dataSource()`: the mock body lives
 * in `./mock/cashback.queries.ts`; the api branch is not wired yet (F2) and
 * returns an empty policy (no tiers, no versions) via `notWiredYet`.
 */

export interface CashbackSettings {
  policy: CashbackPolicy;
  versions: ReadonlyArray<PolicyVersion>;
  /** When a newly saved version would take effect. */
  nextEffectiveFrom: string;
}

/** First day of the Tashkent month `offset` months after `now`, at midnight. */
function monthStart(now: Date, offset: number): string {
  const p = tashkentParts(now);
  const index = p.year * 12 + p.month + offset;
  const year = Math.floor(index / 12);
  const month = String((index % 12) + 1).padStart(2, "0");
  return `${year}-${month}-01T00:00:00+05:00`;
}

/** `GET /api/v1/admin/cashback/policy/` */
export async function getCashbackSettings(): Promise<CashbackSettings> {
  if ((await dataSource()) === "api") {
    const now = await requestNow();
    return notWiredYet("cashback", {
      policy: {
        version: 0,
        effectiveFrom: now.toISOString(),
        tiers: [],
        basis: "before_purchase",
        earnOnCashbackPaid: false,
      },
      versions: [],
      nextEffectiveFrom: monthStart(now, 1),
    });
  }
  return mock.getCashbackSettings();
}

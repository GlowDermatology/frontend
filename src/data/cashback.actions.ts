"use server";

import { z } from "zod";

import {
  analyzeTiers,
  basisPoints,
  type CashbackPolicy,
  type PolicyVersion,
  type TierWarning,
} from "@/domain/cashback";
import { cashbackDataCopy, type CashbackDataCopy } from "@/domain/copy/cashback";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { apiCashbackPolicyFresh, apiCreatePolicyVersion } from "./api/customers";
import {
  mapCashbackSettings,
  mapPolicy,
  mapTierWarning,
  policyVersionBody,
} from "./api/mappers/cashback";
import { toActionResult } from "./api/mappers/errors";
import * as mock from "./mock/cashback.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Cashback policy mutations (contract §2.7, §7.11). The mock body lives in
 * `./mock/cashback.actions.ts`; the api branch posts the draft to
 * `cashback/policy-versions/` with the editor's `Idempotency-Key` (percent as
 * a two-decimal string from integer basis points) and returns the server
 * `warnings` for the toast. Field errors keep the API paths (`tiers.1.from`,
 * `effectiveFrom`), so the editor puts them on the right row.
 */

export interface SavedPolicy {
  policy: CashbackPolicy;
  version: PolicyVersion;
  /** The scheduled version this save replaced (contract §2.7 `superseded_version`). */
  supersededVersion?: number;
  /** Non-blocking notes (gaps, an upper-bounded last tier), shown as a toast. */
  warnings?: TierWarning[];
}

/** The draft's schema in one admin language (messages from `cashbackDataCopy`). */
function draftSchemaFor(m: CashbackDataCopy) {
  const tier = z.object({
    id: z.string().trim().min(1).max(64),
    from: z.int(m.integer).min(0, m.notNegative),
    to: z.int(m.integer).min(1).nullable(),
    percent: z
      .number({ error: m.enterPercent })
      .gt(0, m.percentPositive)
      .max(100, m.percentMax)
      // Integer basis points, read with a tolerance (0.57 is 0.5699… in binary).
      .refine((value) => basisPoints(value) !== null, { error: m.decimals }),
  });
  return z.object({
    version: z.int().min(0),
    effectiveFrom: z.iso.datetime({ offset: true, error: m.chooseEffective }),
    basis: z.enum(["before_purchase", "with_purchase"]),
    earnOnCashbackPaid: z.boolean(),
    tiers: z.array(tier).max(20, m.maxTiers),
  });
}

/** `GET cashback/policy/` right after a save, uncached, so the new row gets its real summary. */
async function readSaved(token: string, version: number): Promise<PolicyVersion | null> {
  try {
    const { data } = await apiCashbackPolicyFresh(token);
    return mapCashbackSettings(data).versions.find((v) => v.version === version) ?? null;
  } catch {
    return null;
  }
}

export async function saveCashbackPolicy(
  draft: CashbackPolicy,
  key: string,
  csrf: string,
): Promise<ActionResult<SavedPolicy>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const m = cashbackDataCopy[await getAdminLocale()];
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: m.badKey };
  const parsed = draftSchemaFor(m).safeParse(draft);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkTiers);
  // Cross-row rules come from the domain (the editor shows the same notices).
  const { tiers } = parsed.data;
  if (tiers.length === 0) return { ok: false, error: m.needTier };
  if (analyzeTiers(tiers).overlaps.length > 0) return { ok: false, error: m.overlap };
  if ((await dataSource()) === "api") {
    return apiMutation("saveCashbackPolicy", async () => {
      const token = sessionToken(guard.session);
      try {
        const { data } = await apiCreatePolicyVersion(
          token,
          policyVersionBody(parsed.data),
          parsedKey.data,
        );
        const fallback: PolicyVersion = {
          version: data.version.version,
          summary: m.newVersion,
          author: data.version.author?.display_name || m.system,
          period: "",
          active: data.version.state === "active",
          scheduled: data.version.state === "scheduled",
          state: data.version.state,
        };
        return {
          ok: true,
          data: {
            policy: mapPolicy(data.version),
            version: (await readSaved(token, data.version.version)) ?? fallback,
            ...(data.superseded_version !== null && {
              supersededVersion: data.superseded_version,
            }),
            ...(data.warnings.length > 0 && { warnings: data.warnings.map(mapTierWarning) }),
          },
        };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.saveCashbackPolicy(parsed.data);
}

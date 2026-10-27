"use server";

import { z } from "zod";

import {
  analyzeTiers,
  basisPoints,
  type CashbackPolicy,
  type PolicyVersion,
  type TierWarning,
} from "@/domain/cashback";

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

const DECIMALS_MESSAGE = "Ko‘pi bilan 2 ta kasr raqam.";

const tierSchema = z.object({
  id: z.string().trim().min(1).max(64),
  from: z.int("Butun son kiriting.").min(0, "Qiymat 0 dan kam bo‘lmasin."),
  to: z.int("Butun son kiriting.").min(1).nullable(),
  percent: z
    .number({ error: "Foizni kiriting." })
    .gt(0, "Foiz 0 dan katta bo‘lsin.")
    .max(100, "Foiz 100 dan oshmasin.")
    // Integer basis points, read with a tolerance (0.57 is 0.5699… in binary).
    .refine((value) => basisPoints(value) !== null, { error: DECIMALS_MESSAGE }),
});

const draftSchema = z.object({
  version: z.int().min(0),
  effectiveFrom: z.iso.datetime({ offset: true, error: "Kuchga kirish sanasini tanlang." }),
  basis: z.enum(["before_purchase", "with_purchase"]),
  earnOnCashbackPaid: z.boolean(),
  tiers: z.array(tierSchema).max(20, "Ko‘pi bilan 20 ta daraja."),
});

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
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) return { ok: false, error: "Noto‘g‘ri so‘rov kaliti." };
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) return fieldErrorsFrom(parsed.error, "Darajalarni tekshiring.");
  // Cross-row rules come from the domain (the editor shows the same notices).
  const { tiers } = parsed.data;
  if (tiers.length === 0) return { ok: false, error: "Kamida bitta daraja kerak." };
  if (analyzeTiers(tiers).overlaps.length > 0) {
    return { ok: false, error: "Darajalar ustma-ust tushmoqda." };
  }
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
          summary: "Yangi versiya",
          author: data.version.author?.display_name || "Tizim",
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

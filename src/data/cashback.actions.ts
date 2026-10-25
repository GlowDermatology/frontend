"use server";

import { z } from "zod";

import { analyzeTiers, type CashbackPolicy, type PolicyVersion } from "@/domain/cashback";

import { apiMutation, fieldErrorsFrom, guardAction, idempotencyKeySchema } from "./action-guard";
import * as mock from "./mock/cashback.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Cashback policy mutations (contract §2.7, §7.11). The mock body lives in
 * `./mock/cashback.actions.ts`; the api branch (F2) posts the draft to
 * `cashback/policy-versions/` with `Idempotency-Key` (percent as a string
 * with ≤ 2 decimals) and surfaces the server `warnings`.
 */

export interface SavedPolicy {
  policy: CashbackPolicy;
  version: PolicyVersion;
  /**
   * Non-blocking notes from the server (contract §2.7 `warnings`), shown as a
   * toast. The demo sends none: the editor already shows gaps and a bounded
   * last tier inline.
   */
  warnings?: string[];
}

const tierSchema = z.object({
  id: z.string().trim().min(1).max(64),
  from: z.int("Butun son kiriting.").min(0, "Qiymat 0 dan kam bo‘lmasin."),
  to: z.int("Butun son kiriting.").min(1).nullable(),
  percent: z
    .number({ error: "Foizni kiriting." })
    .gt(0, "Foiz 0 dan katta bo‘lsin.")
    .max(100, "Foiz 100 dan oshmasin.")
    .refine((value) => Number.isInteger(value * 100), { error: "Ko‘pi bilan 2 ta kasr raqam." }),
});

const policySchema = z.object({
  draft: z.object({
    version: z.int().min(0),
    effectiveFrom: z.iso.datetime({ offset: true, error: "Kuchga kirish sanasini tanlang." }),
    basis: z.enum(["before_purchase", "with_purchase"]),
    earnOnCashbackPaid: z.boolean(),
    tiers: z.array(tierSchema).max(20, "Ko‘pi bilan 20 ta daraja."),
  }),
  key: idempotencyKeySchema,
});

export async function saveCashbackPolicy(
  draft: CashbackPolicy,
  key: string,
  csrf: string,
): Promise<ActionResult<SavedPolicy>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = policySchema.safeParse({ draft, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, "Darajalarni tekshiring.");
  // Cross-row rules come from the domain (the editor shows the same notices).
  const { tiers } = parsed.data.draft;
  if (tiers.length === 0) return { ok: false, error: "Kamida bitta daraja kerak." };
  if (analyzeTiers(tiers).overlaps.length > 0) {
    return { ok: false, error: "Darajalar ustma-ust tushmoqda." };
  }
  if ((await dataSource()) === "api") return apiMutation("saveCashbackPolicy");
  return mock.saveCashbackPolicy(parsed.data.draft);
}

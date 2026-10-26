import {
  analyzeTiers,
  policyPeriod,
  policySummary,
  type CashbackPolicy,
  type TierWarning,
} from "@/domain/cashback";

import type { SavedPolicy } from "../cashback.actions";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { getCashbackSettings } from "./cashback.queries";

/**
 * Mock implementation of `src/data/cashback.actions.ts`: the active policy
 * comes from the fixtures and the draft from the action, which has already
 * re-validated it (zod + `analyzeTiers`). Versions are append-only; nothing
 * is persisted. The summary, period and warnings follow the backend's rules
 * (contract §2.7, §5.4), computed by the same domain functions the api
 * mapper uses.
 */

/** Gaps and an upper-bounded last tier, as the backend's 201 `warnings`. */
export function tierWarnings(draft: Pick<CashbackPolicy, "tiers">): TierWarning[] {
  const analysis = analyzeTiers(draft.tiers);
  const warnings: TierWarning[] = analysis.gaps.map((gap) => ({ code: "gap", ...gap }));
  if (analysis.uncoveredAbove !== null) {
    warnings.push({ code: "uncovered_above", from: analysis.uncoveredAbove, to: null });
  }
  return warnings;
}

export async function saveCashbackPolicy(
  draft: CashbackPolicy,
): Promise<ActionResult<SavedPolicy>> {
  await delay(600);
  const { policy: active, scheduled } = await getCashbackSettings();
  // The previous non-superseded version: a scheduled one is superseded by this save.
  const previous = active;
  const version = Math.max(active.version, scheduled?.version ?? 0) + 1;
  const warnings = tierWarnings(draft);
  return {
    ok: true,
    data: {
      policy: { ...draft, version },
      version: {
        version,
        summary: policySummary(draft.tiers, previous.tiers),
        author: "Administrator",
        period: policyPeriod({
          effectiveFrom: draft.effectiveFrom,
          effectiveTo: null,
          state: "scheduled",
        }),
        active: false,
        scheduled: true,
        state: "scheduled",
      },
      ...(scheduled && { supersededVersion: scheduled.version }),
      ...(warnings.length > 0 && { warnings }),
    },
  };
}

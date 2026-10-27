import {
  basisPoints,
  percentString,
  policyPeriod,
  policySummary,
  type CashbackPolicy,
  type CashbackTier,
  type PolicyVersion,
  type TierWarning,
} from "@/domain/cashback";

import type { CashbackSettings } from "../../cashback";
import type {
  ApiCashbackPolicy,
  ApiPolicyVersion,
  ApiPolicyVersionCreate,
  ApiTierWarning,
} from "../types";
import { idString } from "./common";

/**
 * Cashback policy (contract §2.7) → the FE domain types per §5.4: the
 * active and scheduled versions as `CashbackPolicy`, every version as a
 * history row whose summary diffs its tiers against the previous
 * non-superseded version by `(from, to, percent)`.
 */

export function mapPolicyTier(api: ApiPolicyVersion["tiers"][number]): CashbackTier {
  return { id: idString(api.id), from: api.from, to: api.to, percent: Number(api.percent) };
}

export function mapPolicy(api: ApiPolicyVersion): CashbackPolicy {
  return {
    version: api.version,
    effectiveFrom: api.effective_from,
    basis: api.basis,
    earnOnCashbackPaid: api.earn_on_cashback_paid,
    tiers: api.tiers.map(mapPolicyTier),
  };
}

/** The highest lower version whose state is not `superseded` (§5.4 "prev"), or `null`. */
function previousOf(
  version: ApiPolicyVersion,
  all: ReadonlyArray<ApiPolicyVersion>,
): ApiPolicyVersion | null {
  let best: ApiPolicyVersion | null = null;
  for (const candidate of all) {
    if (candidate.version >= version.version || candidate.state === "superseded") continue;
    if (!best || candidate.version > best.version) best = candidate;
  }
  return best;
}

/** One history row; `all` is the full version list the summary looks the previous version up in. */
export function mapPolicyVersion(
  api: ApiPolicyVersion,
  all: ReadonlyArray<ApiPolicyVersion>,
): PolicyVersion {
  const previous = previousOf(api, all);
  return {
    version: api.version,
    summary: policySummary(
      api.tiers.map(mapPolicyTier),
      previous?.tiers.map(mapPolicyTier) ?? null,
    ),
    author: api.author?.display_name || "Tizim",
    period: policyPeriod({
      effectiveFrom: api.effective_from,
      effectiveTo: api.effective_to,
      state: api.state,
    }),
    active: api.state === "active",
    scheduled: api.state === "scheduled",
    state: api.state,
  };
}

/**
 * `GET cashback/policy/` → the editor's settings. Without an active version
 * (a database with no policy yet) the editor starts from an empty v0 that
 * takes effect at `next_effective_from`.
 */
export function mapCashbackSettings(api: ApiCashbackPolicy): CashbackSettings {
  const versions = [...api.versions].sort((a, b) => b.version - a.version);
  return {
    policy: api.active
      ? mapPolicy(api.active)
      : {
          version: 0,
          effectiveFrom: api.next_effective_from,
          basis: "before_purchase",
          earnOnCashbackPaid: false,
          tiers: [],
        },
    scheduled: api.scheduled ? mapPolicy(api.scheduled) : null,
    versions: versions.map((version) => mapPolicyVersion(version, versions)),
    nextEffectiveFrom: api.next_effective_from,
  };
}

/**
 * Body of `POST cashback/policy-versions/`: tiers in the editor's order (so a
 * `tiers.{i}.*` error lands on row `i`), percent as a two-decimal string
 * from integer basis points (`1.5` → `"1.50"`, never a JSON number).
 */
export function policyVersionBody(draft: CashbackPolicy): ApiPolicyVersionCreate {
  return {
    effective_from: draft.effectiveFrom,
    basis: draft.basis,
    earn_on_cashback_paid: draft.earnOnCashbackPaid,
    tiers: draft.tiers.map((tier) => {
      const bp = basisPoints(tier.percent);
      return {
        from: tier.from,
        to: tier.to,
        // The action re-validates the percent first; a value it let through is two-decimal.
        percent: bp === null ? String(tier.percent) : percentString(bp),
      };
    }),
  };
}

export function mapTierWarning(api: ApiTierWarning): TierWarning {
  return { code: api.code, from: api.from, to: api.to };
}

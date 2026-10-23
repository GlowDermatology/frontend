import "server-only";

import type { CashbackPolicy, PolicyVersion } from "@/domain/cashback";

import { ACTIVE_POLICY, NEXT_EFFECTIVE_FROM, POLICY_VERSIONS } from "./mock/cashback";

export interface CashbackSettings {
  policy: CashbackPolicy;
  versions: ReadonlyArray<PolicyVersion>;
  /** When a newly saved version would take effect. */
  nextEffectiveFrom: string;
}

/** `GET /api/v1/admin/cashback/policy/` */
export async function getCashbackSettings(): Promise<CashbackSettings> {
  return {
    policy: ACTIVE_POLICY,
    versions: POLICY_VERSIONS,
    nextEffectiveFrom: NEXT_EFFECTIVE_FROM,
  };
}

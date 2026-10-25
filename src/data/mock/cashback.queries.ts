import type { CashbackSettings } from "../cashback";
import { ACTIVE_POLICY, NEXT_EFFECTIVE_FROM, POLICY_VERSIONS } from "./cashback";

/** Mock implementation of `src/data/cashback.ts`. */
export async function getCashbackSettings(): Promise<CashbackSettings> {
  return {
    policy: ACTIVE_POLICY,
    versions: POLICY_VERSIONS,
    nextEffectiveFrom: NEXT_EFFECTIVE_FROM,
  };
}

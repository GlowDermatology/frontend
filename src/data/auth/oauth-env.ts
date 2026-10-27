import "server-only";

import { connection } from "next/server";

import {
  ConsumedStates,
  FlowThrottle,
  consumedStateKey,
  deriveOAuthKey,
  flowExpiresAt,
  openNotice,
  readOAuthConfig,
  type OAuthConfig,
  type OAuthFlow,
  type OAuthNotice,
} from "./oauth";

/**
 * Request-time OAuth settings (read after `connection()` by the callers, so
 * one build serves every configuration). Configuration warnings are logged
 * once per distinct message per process.
 */

type Holder = typeof globalThis & {
  __glowdermaOAuthWarned?: Set<string>;
  __glowdermaOAuthUsedStates?: ConsumedStates;
  __glowdermaOAuthThrottle?: FlowThrottle;
};
// On `globalThis`: the route handlers and the pages are separate bundles
// that each evaluate this module.
const holder = globalThis as Holder;

function warnOnce(warning: string): void {
  const warned = (holder.__glowdermaOAuthWarned ??= new Set<string>());
  if (warned.has(warning)) return;
  warned.add(warning);
  console.warn(`[oauth] ${warning}`);
}

export function oauthConfig(): OAuthConfig {
  const config = readOAuthConfig(process.env);
  for (const warning of config.warnings) warnOnce(warning);
  return config;
}

/** HMAC key of the flow cookie and the `?oauth=` notices (see `deriveOAuthKey`). */
export function oauthKey(): Buffer {
  return deriveOAuthKey(process.env.GLOWDERMA_INTERNAL_SECRET || undefined);
}

/**
 * The signed `?oauth=` notice of this request (wall clock, after
 * `connection()`: the callback stamps it with the real time in both modes).
 */
export async function requestNotice(token: unknown): Promise<OAuthNotice | null> {
  await connection();
  return openNotice(token, oauthKey(), Date.now());
}

/**
 * When this process started (less a second of slack), from `process.uptime()`
 * so it does not depend on which module was evaluated first. A flow issued
 * earlier belongs to a previous process, which may have accepted it already.
 */
function processStartedAtMs(): number {
  return Date.now() - process.uptime() * 1000 - 1000;
}

/**
 * Marks a flow's state as used in this process (see `ConsumedStates`);
 * `false` for a replay, a flow from before this process started, or when the
 * set is full (logged once).
 */
export function consumeFlowState(flow: OAuthFlow, nowMs: number): boolean {
  holder.__glowdermaOAuthUsedStates ??= new ConsumedStates({ startedAtMs: processStartedAtMs() });
  const result = holder.__glowdermaOAuthUsedStates.consume(
    {
      key: consumedStateKey(oauthKey(), flow.state),
      issuedAtMs: flow.issuedAt,
      expiresAtMs: flowExpiresAt(flow),
    },
    nowMs,
  );
  if (result === "full") {
    warnOnce(
      "the used-state set is full: OAuth callbacks are refused until flows expire " +
        "(many flows from many addresses — check the edge logs)",
    );
  }
  return result === "fresh";
}

/**
 * Counts a flow `start` is about to create for `clientIp` (see
 * `FlowThrottle`); `false` when that address has used up its window. No
 * address (no edge in front, local development) is not throttled.
 */
export function allowFlowStart(clientIp: string | undefined, nowMs: number): boolean {
  if (!clientIp) return true;
  holder.__glowdermaOAuthThrottle ??= new FlowThrottle();
  return holder.__glowdermaOAuthThrottle.allow(clientIp, nowMs);
}

import "server-only";

import { connection } from "next/server";

import {
  ConsumedStates,
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

export function oauthConfig(): OAuthConfig {
  const config = readOAuthConfig(process.env);
  // On `globalThis`: the route handlers and the pages are separate bundles.
  const holder = globalThis as typeof globalThis & { __glowdermaOAuthWarned?: Set<string> };
  const warned = (holder.__glowdermaOAuthWarned ??= new Set<string>());
  for (const warning of config.warnings) {
    if (warned.has(warning)) continue;
    warned.add(warning);
    console.warn(`[oauth] ${warning}`);
  }
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
 * Marks a flow's state as used in this process (see `ConsumedStates`);
 * `false` for a replay. On `globalThis` for the same reason as the key: the
 * route bundles each evaluate this module.
 */
export function consumeFlowState(flow: OAuthFlow, nowMs: number): boolean {
  const holder = globalThis as typeof globalThis & { __glowdermaOAuthStates?: ConsumedStates };
  holder.__glowdermaOAuthStates ??= new ConsumedStates();
  return holder.__glowdermaOAuthStates.consume(
    consumedStateKey(oauthKey(), flow.state),
    flowExpiresAt(flow),
    nowMs,
  );
}

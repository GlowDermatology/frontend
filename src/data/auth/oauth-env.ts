import "server-only";

import { connection } from "next/server";

import {
  deriveOAuthKey,
  openNotice,
  readOAuthConfig,
  type OAuthConfig,
  type OAuthNotice,
} from "./oauth";

/**
 * Request-time OAuth settings (read after `connection()` by the callers, so
 * one build serves every configuration). Configuration warnings are logged
 * once per distinct message per process.
 */

const warned = new Set<string>();

export function oauthConfig(): OAuthConfig {
  const config = readOAuthConfig(process.env);
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

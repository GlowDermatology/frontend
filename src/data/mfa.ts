import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";

import type { MfaStatus } from "@/domain/settings";
import { serverEnv } from "@/lib/env.server";

import { verifyStaff } from "./auth";
import { mfaChallengeCookieName, openPendingMfa, type PendingMfa } from "./auth/mfa-challenge";
import { isApiError } from "./api/errors";
import { apiMfaStatus } from "./mfa-api";
import {
  MOCK_MFA_COOKIE,
  mockMfaCookieValue,
  readMockMfaState,
  type MockMfaState,
} from "./mock/mfa";

/**
 * The admin panel MFA read seam (DESIGN §E "MFA", contract §2.1 `GET auth/mfa/`), for the
 * Settings card. Mock mode reads the demo state (`src/data/mock/mfa.ts`).
 */

/** The caller's MFA state; `null` when there is no session or the backend could not answer. */
export async function getMfaStatus(): Promise<MfaStatus | null> {
  const session = await verifyStaff();
  if (!session.ok) return null;
  if (session.mode === "mock") return mockMfaState();
  try {
    const { data } = await apiMfaStatus(session.token);
    return { enabled: data.enabled, recoveryCodesLeft: data.recovery_codes_left };
  } catch (error) {
    if (isApiError(error)) return null;
    throw error;
  }
}

/** The demo account's MFA in this browser (`gd_mock_mfa`, else `GLOWDERMA_MOCK_MFA`). */
export async function mockMfaState(): Promise<MockMfaState> {
  const store = await cookies();
  return readMockMfaState(store.get(MOCK_MFA_COOKIE)?.value, serverEnv.mockMfa());
}

/** Keeps the demo's change for this browser (Server Actions only: they may set cookies). */
export async function saveMockMfaState(state: MockMfaState): Promise<void> {
  (await cookies()).set(MOCK_MFA_COOKIE, mockMfaCookieValue(state), {
    httpOnly: true,
    secure: serverEnv.cookieSecure(),
    sameSite: "strict",
    path: "/admin",
  });
}

/**
 * The sign-in's pending second step of this browser (`/admin/mfa`): the challenge cookie opened,
 * with the seconds it has left by the wall clock; `null` when there is none (expired, used,
 * never started). For the step page; the challenge itself stays on the server.
 */
export async function pendingMfaStep(): Promise<{
  pending: PendingMfa;
  secondsLeft: number;
} | null> {
  const store = await cookies();
  // The wall clock only at request time (Cache Components: never in a prerender).
  await connection();
  const nowMs = Date.now();
  const pending = openPendingMfa(
    store.get(mfaChallengeCookieName(serverEnv.cookieSecure()))?.value,
    nowMs,
  );
  if (!pending) return null;
  return { pending, secondsLeft: Math.max(0, Math.floor((pending.expiresAtMs - nowMs) / 1000)) };
}

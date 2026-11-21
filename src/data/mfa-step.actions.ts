"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { mfaDataCopy } from "@/domain/copy/mfa";
import { serverEnv } from "@/lib/env.server";
import { copyFor, getLocalized } from "@/lib/i18n/admin-locale";

import { cookieNames } from "./auth/cookie-names";
import { csrfMatches } from "./auth/csrf";
import {
  backToSignIn,
  clearMfaChallengeCookie,
  mfaChallengeCookieName,
  openPendingMfa,
} from "./auth/mfa-challenge";
import { safeNext, staffDestination } from "./auth/next-param";
import { applyStaffSession } from "./auth/session-cookies";
import { mockMfaState, saveMockMfaState } from "./mfa";
import { apiMfaVerify } from "./mfa-api";
import { mfaStepRefusal } from "./mfa-errors";
import { mfaSchemas } from "./mfa.schema";
import { delay } from "./mock/delay";
import {
  MOCK_LOCKED_CODE,
  MOCK_LOCK_SECONDS,
  MOCK_TOTP_CODE,
  isMockRecoveryCode,
} from "./mock/mfa";

/**
 * The sign-in's second step at `/admin/mfa` (DESIGN §E "MFA", contract §2.1 `auth/mfa/verify/`).
 * Public: there is no session yet. The challenge never leaves the server side: it is read from the
 * step page's HttpOnly cookie (`src/data/auth/mfa-challenge.ts`), never from the form.
 *
 * - success → the session is set exactly like the password login (`applyStaffSession`), the
 *   challenge cookie is cleared and the browser continues at the validated `next`;
 * - a wrong code (`mfa_code_invalid`) keeps the challenge: the field shows the message;
 * - a dead challenge (`mfa_challenge_invalid`, or the cookie expired) clears it and returns to the
 *   sign-in page with the localized `notice=mfa_expired`;
 * - 429 shows the wait (`retryAfter`).
 */

export type MfaFactor = "totp" | "recovery";

export interface MfaStepState {
  factor: MfaFactor;
  /** The code field's message (wrong format, wrong or used code). */
  codeError: string | null;
  /** Anything else: throttling, an outage, a stale page. */
  formError: string | null;
  /** Seconds the backend refuses codes for (429 with `Retry-After`). */
  retryAfter: number | null;
  /** Bumped on every answer, so the form can reveal the error again after the same message. */
  attempt: number;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** `useActionState` action of the step's form (`factor`, `code`, `csrf`, `fallbackNext`). */
export async function verifyMfaStep(
  previous: MfaStepState,
  formData: FormData,
): Promise<MfaStepState> {
  const m = await copyFor(mfaDataCopy);
  const factor: MfaFactor = text(formData, "factor") === "recovery" ? "recovery" : "totp";
  const answer = (patch: Partial<MfaStepState>): MfaStepState => ({
    factor,
    codeError: null,
    formError: null,
    retryAfter: null,
    attempt: previous.attempt + 1,
    ...patch,
  });
  const secure = serverEnv.cookieSecure();
  const store = await cookies();
  // A public form: the double-submit token the proxy minted when the page was served.
  if (!csrfMatches(store.get(cookieNames(secure).csrf)?.value, text(formData, "csrf"))) {
    return answer({ formError: m.staleForm });
  }

  const nowMs = Date.now();
  const pending = openPendingMfa(store.get(mfaChallengeCookieName(secure))?.value, nowMs);
  if (!pending) {
    clearMfaChallengeCookie(store, secure);
    redirect(backToSignIn(safeNext(text(formData, "fallbackNext")), true));
  }

  const parsed = (await getLocalized(mfaSchemas)).verify.safeParse({
    factor,
    code: text(formData, "code"),
  });
  if (!parsed.success) {
    return answer({ codeError: parsed.error.issues[0]?.message ?? m.codeFormat });
  }
  const { code } = parsed.data;

  if (serverEnv.dataSource() === "mock") {
    await delay(400);
    if (factor === "totp" && code === MOCK_LOCKED_CODE) {
      return answer({
        formError: m.throttledFor(MOCK_LOCK_SECONDS),
        retryAfter: MOCK_LOCK_SECONDS,
      });
    }
    const accepted = factor === "totp" ? code === MOCK_TOTP_CODE : isMockRecoveryCode(code);
    if (!accepted) return answer({ codeError: m.codeInvalid });
    if (factor === "recovery") {
      const state = await mockMfaState();
      await saveMockMfaState({
        enabled: true,
        recoveryCodesLeft: Math.max(0, state.recoveryCodesLeft - 1),
      });
    }
    clearMfaChallengeCookie(store, secure);
    redirect(pending.next);
  }

  let data;
  try {
    data = (
      await apiMfaVerify(
        factor === "totp"
          ? { challenge: pending.challenge, code }
          : { challenge: pending.challenge, recovery_code: code },
      )
    ).data;
  } catch (error) {
    const refusal = mfaStepRefusal(error, m);
    if (refusal.kind === "challenge") {
      clearMfaChallengeCookie(store, secure);
      redirect(backToSignIn(pending.next, true));
    }
    if (refusal.kind === "code") return answer({ codeError: refusal.message });
    if (refusal.kind === "throttled") {
      return answer({
        formError: refusal.message,
        retryAfter: refusal.retryAfter,
      });
    }
    return answer({ formError: refusal.message });
  }

  if (!applyStaffSession(store, data, secure, Date.now()))
    return answer({ formError: m.unreachable });
  clearMfaChallengeCookie(store, secure);
  redirect(staffDestination(data.user?.role, pending.next));
}

/**
 * «Kirish sahifasiga qaytish» (and the expired state's button): drops the challenge and returns to
 * the sign-in page, keeping `next`. `expired` adds the localized notice.
 */
export async function leaveMfaStep(formData: FormData): Promise<void> {
  const secure = serverEnv.cookieSecure();
  const store = await cookies();
  const pending = openPendingMfa(store.get(mfaChallengeCookieName(secure))?.value, Date.now());
  clearMfaChallengeCookie(store, secure);
  const next = pending?.next ?? safeNext(text(formData, "fallbackNext"));
  redirect(backToSignIn(next, text(formData, "expired") === "1"));
}

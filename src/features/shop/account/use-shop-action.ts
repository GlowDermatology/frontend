"use client";

import { useCallback, useState, useTransition } from "react";

import type { ActionFailure, ActionResult } from "@/data/types";
import type { Locale } from "@/lib/i18n/locales";

import { commonCopy } from "../copy/common";
import { runShopAction } from "../shared/action-client";

/**
 * One island's Server Action runner: the csrf token, one refresh-and-retry
 * on `session_expired` (`runShopAction`), a pending flag for the button and
 * the failure to show. The failure's text is the API's own localized
 * message; the csrf refusal gets the island's "reload the page" text.
 */
export function failureText(failure: ActionFailure, locale: Locale): string {
  const copy = commonCopy[locale];
  if (failure.code === "csrf") return copy.errors.csrf;
  if (failure.code === "session_expired") return "";
  return failure.error || copy.errors.network;
}

export interface ShopActionRunner {
  pending: boolean;
  error: ActionFailure | null;
  setError: (failure: ActionFailure | null) => void;
  /** Runs the action; failures are stored in `error` and also returned. */
  run: <T>(invoke: (csrf: string) => Promise<ActionResult<T>>) => Promise<ActionResult<T>>;
}

export function useShopAction(locale: Locale): ShopActionRunner {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ActionFailure | null>(null);
  const run = useCallback(
    <T>(invoke: (csrf: string) => Promise<ActionResult<T>>) =>
      new Promise<ActionResult<T>>((resolve) => {
        setError(null);
        startTransition(async () => {
          const result = await runShopAction(locale, invoke);
          if (!result.ok) setError(result);
          resolve(result);
        });
      }),
    [locale],
  );
  return { pending, error, setError, run };
}

/** Seconds left of a countdown that starts at `seconds` whenever `key` changes. */
export function remainingSeconds(startedAt: number, seconds: number, now: number): number {
  return Math.max(0, Math.ceil(seconds - (now - startedAt) / 1000));
}

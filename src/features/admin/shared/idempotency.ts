"use client";

import { useCallback, useState } from "react";

import type { ActionResult } from "@/data/types";

/**
 * Idempotency keys for the mutating Server Actions (contract §1.7). One key
 * per form or dialog instance, created when the component mounts (dialogs
 * mount once and toggle `open`, so a key survives re-opens), reused on every
 * retry — including the automatic refresh-and-retry in `runAction` — and
 * renewed only after a success (a replay counts as success) or after the
 * server answered 422 `idempotency_key_reused`.
 */

/** The renewal rule, kept pure so it can be unit-tested. */
export function shouldRenewKey(result: ActionResult<unknown>): boolean {
  return result.ok || result.code === "idempotency_key_reused";
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export interface IdempotencyKey {
  key: string;
  /** Discards the current key; the next call gets a fresh one. */
  renew: () => void;
  /** Applies `shouldRenewKey` to an action result; returns the result unchanged. */
  settle: <T>(result: ActionResult<T>) => ActionResult<T>;
}

export function useIdempotencyKey(): IdempotencyKey {
  const [key, setKey] = useState(newIdempotencyKey);
  const renew = useCallback(() => setKey(newIdempotencyKey()), []);
  const settle = useCallback(<T>(result: ActionResult<T>) => {
    if (shouldRenewKey(result)) setKey(newIdempotencyKey());
    return result;
  }, []);
  return { key, renew, settle };
}

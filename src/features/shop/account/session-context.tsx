"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { SHOP_REFRESH_PATH } from "@/data/customer-auth/proxy-decision";
import { headerSummary } from "@/data/shop/account.actions";
import type { ShopHeaderSummary } from "@/domain/shop-account";
import { refreshSessionAt } from "@/lib/actions/action-client";
import type { Locale } from "@/lib/i18n/locales";

import { browserShopEnv, hasSignedInHint } from "../shared/action-client";

/**
 * The signed-in customer as the static header sees it: name, cart quantity
 * and unread inbox count. The header and footer are prerendered once for
 * everyone, so this is loaded in the browser after hydration — only when the
 * readable signed-in hint cookie is set, so anonymous visitors make no call.
 * Islands that change the cart or read messages push the new numbers here.
 */

interface ShopSessionValue {
  /** `null` until loaded (or for anonymous visitors). */
  summary: ShopHeaderSummary | null;
  signedInHint: boolean;
  setCartQuantity: (quantity: number) => void;
  setUnread: (count: number) => void;
  reload: () => void;
}

const ShopSessionContext = createContext<ShopSessionValue | null>(null);

const subscribeNever = () => () => {};

/** `true` after hydration when the signed-in hint cookie is set; `false` on the server. */
export function useSignedInHint(): boolean {
  return useSyncExternalStore(subscribeNever, hasSignedInHint, () => false);
}

async function loadSummary(locale: Locale): Promise<ShopHeaderSummary | null> {
  try {
    let result = await headerSummary({ locale });
    if (!result.ok && result.code === "session_expired") {
      // One single-flight refresh, then ask again; a dead session shows "Kirish".
      if (await refreshSessionAt(SHOP_REFRESH_PATH, browserShopEnv())) {
        result = await headerSummary({ locale });
      }
    }
    return result.ok ? result.data : null;
  } catch {
    return null;
  }
}

export function ShopSessionProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const signedInHint = useSignedInHint();
  const [summary, setSummary] = useState<ShopHeaderSummary | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!signedInHint) return;
    let cancelled = false;
    void loadSummary(locale).then((value) => {
      if (!cancelled) setSummary(value);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, signedInHint, version]);

  const setCartQuantity = useCallback((quantity: number) => {
    setSummary((current) => (current ? { ...current, cartQuantity: quantity } : current));
  }, []);
  const setUnread = useCallback((count: number) => {
    setSummary((current) => (current ? { ...current, unread: count } : current));
  }, []);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  const value = useMemo(
    () => ({ summary, signedInHint, setCartQuantity, setUnread, reload }),
    [summary, signedInHint, setCartQuantity, setUnread, reload],
  );
  return <ShopSessionContext value={value}>{children}</ShopSessionContext>;
}

const FALLBACK: ShopSessionValue = {
  summary: null,
  signedInHint: false,
  setCartQuantity: () => {},
  setUnread: () => {},
  reload: () => {},
};

export function useShopSession(): ShopSessionValue {
  return use(ShopSessionContext) ?? FALLBACK;
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { qrToken } from "@/data/shop/commerce.actions";
import type { ShopQrToken } from "@/domain/shop-account";
import type { Locale } from "@/lib/i18n/locales";

import { FormAlert } from "../account/controls";
import { PhoneGate } from "../account/phone-gate";
import { failureText, useShopAction } from "../account/use-shop-action";
import { loyaltyCopy } from "../copy/loyalty";
import { shopPath } from "../routing/routes";
import { qrDrawing } from "./qr-matrix";

/**
 * The in-store QR (contract §2.9.3): a fresh single-use token every
 * `refresh_in_seconds` (50 s) with a visible countdown, a new one whenever
 * the page regains focus, hidden while the tab is in the background, and a
 * "Yangilash" button for a re-scan. A phoneless account gets the phone gate
 * first (409 `phone_required`).
 */
export function QrPanel({ locale }: { locale: Locale }) {
  const copy = loyaltyCopy[locale].qr;
  const { run, pending, error } = useShopAction(locale);
  const [token, setToken] = useState<(ShopQrToken & { receivedAt: number }) | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [visible, setVisible] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);

  const load = useCallback(async () => {
    const result = await run((csrf) => qrToken({ locale, csrf }));
    if (result.ok) {
      setToken({ ...result.data, receivedAt: Date.now() });
      setNow(Date.now());
    } else {
      setToken(null);
      if (result.code === "phone_required") setGateOpen(true);
    }
  }, [locale, run]);

  // First token, and a new one whenever the tab comes back.
  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const onVisibility = () => {
      const shown = document.visibilityState === "visible";
      setVisible(shown);
      if (shown) void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(first);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  // The countdown, and the refresh when it reaches zero.
  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [token]);

  const elapsed = token ? Math.floor((now - token.receivedAt) / 1000) : 0;
  const left = token ? Math.max(0, token.refreshInSeconds - elapsed) : 0;
  const expired = token ? elapsed >= token.ttlSeconds : false;

  useEffect(() => {
    if (!token || !visible) return;
    const due = token.refreshInSeconds * 1000 - (Date.now() - token.receivedAt);
    const timer = window.setTimeout(() => void load(), Math.max(0, due));
    return () => window.clearTimeout(timer);
  }, [token, visible, load]);

  const phoneRequired = error?.code === "phone_required";
  const drawing = token ? qrDrawing(token.token) : null;
  const progress = token ? left / token.refreshInSeconds : 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex w-full max-w-[380px] flex-col items-center gap-5 rounded-lg border border-line bg-surface-raised p-[clamp(20px,4vw,36px)] shadow-sm">
        <div className="relative aspect-square w-full max-w-[300px] rounded-md bg-white p-2">
          {drawing && visible && !expired ? (
            <svg
              role="img"
              aria-label={copy.alt}
              viewBox={`0 0 ${drawing.size} ${drawing.size}`}
              shapeRendering="crispEdges"
              className="size-full"
            >
              <rect width={drawing.size} height={drawing.size} fill="#ffffff" />
              <path d={drawing.path} fill="#2a2418" />
            </svg>
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 text-center text-ink-muted">
              <Icon name="qr" size={48} />
              <span className="text-body-sm">
                {!visible ? copy.hidden : expired ? copy.expired : pending ? "…" : ""}
              </span>
            </div>
          )}
        </div>
        {token && visible ? (
          <div className="flex w-full flex-col items-center gap-2">
            <div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="m-0 text-body-sm text-ink-muted tabular-nums" aria-live="off">
              {copy.refreshesIn(left)}
            </p>
          </div>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => void load()}
          disabled={pending}
          aria-busy={pending || undefined}
        >
          <Icon name="refresh" size={18} />
          {copy.refresh}
        </Button>
      </div>
      <p className="m-0 max-w-[460px] text-center text-body-sm text-pretty text-ink-muted">
        {copy.hint}
      </p>
      {phoneRequired ? (
        <div className="flex max-w-[460px] flex-col items-center gap-3 text-center">
          <p className="m-0 text-subheading">{copy.phoneTitle}</p>
          <p className="m-0 text-body text-ink-muted">{copy.phoneBody}</p>
          <Button onClick={() => setGateOpen(true)}>{copy.phoneAction}</Button>
        </div>
      ) : error ? (
        <FormAlert>{failureText(error, locale) || copy.failed}</FormAlert>
      ) : null}
      <PhoneGate
        locale={locale}
        open={gateOpen}
        onOpenChange={setGateOpen}
        next={shopPath(locale, { kind: "qr" })}
        onAttached={() => void load()}
      />
    </div>
  );
}

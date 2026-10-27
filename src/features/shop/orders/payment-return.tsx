"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Rings } from "@/components/brand/rings";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { orderStatus, simulatePayment } from "@/data/shop/commerce.actions";
import type { ShopOrderSummary } from "@/domain/shop-account";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import { useShopAction } from "../account/use-shop-action";
import { ordersCopy } from "../copy/orders";
import { runShopAction } from "../shared/action-client";
import { POLL_INTERVAL_MS, keepPolling, paymentPhase, type PaymentPhase } from "./payment-phase";

/**
 * The return from Click or Payme (`PAYMENT_WEB_RETURN_URL` →
 * `/buyurtmalar/{id}?paid=1`): polls the order every 2 s for up to a minute
 * until the payment is confirmed or refused, then shows a calm confirmation
 * (or the way to pay again) and refreshes the page below.
 */
export function PaymentReturn({
  locale,
  orderId,
  initial,
}: {
  locale: Locale;
  orderId: number;
  initial: Pick<ShopOrderSummary, "status" | "payment">;
}) {
  const copy = ordersCopy[locale].payment;
  const router = useRouter();
  const startedAt = useRef<number | null>(null);
  const [phase, setPhase] = useState<PaymentPhase>(() => paymentPhase(initial, 0));
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!keepPolling(phase)) return;
    startedAt.current ??= Date.now();
    const timer = window.setTimeout(async () => {
      const result = await runShopAction(locale, (csrf) => orderStatus({ locale, orderId, csrf }));
      const elapsed = Date.now() - (startedAt.current ?? Date.now());
      if (result.ok) {
        const next = paymentPhase(result.data, elapsed);
        setPhase(next);
        if (!keepPolling(next)) router.refresh();
      } else if (elapsed >= 60_000) {
        setPhase("pending");
      }
      setRound((value) => value + 1);
    }, POLL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase, round, locale, orderId, router]);

  const content: Record<PaymentPhase, { title: string; body: string; tone: string }> = {
    checking: { title: copy.checkingTitle, body: copy.checkingBody, tone: "gold" },
    paid: { title: copy.paidTitle, body: copy.paidBody, tone: "success" },
    failed: { title: copy.failedTitle, body: copy.failedBody, tone: "danger" },
    expired: { title: copy.expiredTitle, body: copy.failedBody, tone: "danger" },
    pending: { title: copy.pendingTitle, body: copy.pendingBody, tone: "gold" },
  };
  const view = content[phase];

  return (
    <section
      role="status"
      aria-live="polite"
      className="relative flex flex-col items-center gap-4 overflow-hidden rounded-lg border border-line bg-surface-raised px-6 py-[clamp(36px,5vw,56px)] text-center"
    >
      <Rings
        viewBox={400}
        rings={[
          [70, 0.5],
          [110, 0.3],
          [150, 0.16],
        ]}
        className={cn(
          "absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2",
          phase === "checking" && "motion-safe:animate-pulse",
        )}
      />
      <span
        className={cn(
          "relative flex size-16 animate-pop-in items-center justify-center rounded-full",
          view.tone === "success" && "bg-success-soft text-success",
          view.tone === "danger" && "bg-danger-soft text-danger-strong",
          view.tone === "gold" && "bg-gold-soft text-gold-ink",
        )}
      >
        <Icon
          name={
            phase === "paid"
              ? "check"
              : phase === "failed" || phase === "expired"
                ? "alert-circle"
                : "clock"
          }
          size={30}
          strokeWidth={2}
        />
      </span>
      <h2 className="relative m-0 font-serif text-headline-sm font-semibold text-ink">
        {view.title}
      </h2>
      <p className="relative m-0 max-w-[460px] text-body text-pretty text-ink-muted">{view.body}</p>
      {phase === "pending" ? (
        <Button
          variant="secondary"
          className="relative"
          onClick={() => {
            startedAt.current = Date.now();
            setPhase("checking");
          }}
        >
          <Icon name="refresh" size={18} />
          {copy.refresh}
        </Button>
      ) : null}
    </section>
  );
}

/**
 * The local payment sandbox (`GLOWDERMA_PAYMENT_SANDBOX=true`): stands in for
 * the provider page and runs the backend's dev simulate endpoint.
 */
export function PaymentSandbox({
  locale,
  orderId,
  returnUrl,
}: {
  locale: Locale;
  orderId: number;
  returnUrl: string;
}) {
  const copy = ordersCopy[locale].payment;
  const { run, pending, error } = useShopAction(locale);
  const simulate = async (outcome: "success" | "fail") => {
    const result = await run((csrf) => simulatePayment({ locale, orderId, outcome, csrf }));
    if (result.ok) window.location.assign(returnUrl);
  };
  return (
    <section className="flex flex-col gap-3 rounded-lg border-[1.5px] border-dashed border-gold-ink bg-gold-soft/50 p-5">
      <h2 className="m-0 text-subheading text-ink">{copy.sandboxTitle}</h2>
      <p className="m-0 text-body-sm text-ink">{copy.sandboxBody}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void simulate("success")}
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {copy.sandboxPay}
        </Button>
        <Button variant="secondary" onClick={() => void simulate("fail")} disabled={pending}>
          {copy.sandboxFail}
        </Button>
      </div>
      {error ? <p className="m-0 text-body-sm text-danger-strong">{error.error}</p> : null}
    </section>
  );
}

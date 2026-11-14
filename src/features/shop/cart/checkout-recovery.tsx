"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { reorder, startPayment } from "@/data/shop/commerce.actions";
import type { PaymentProvider, ShopCart, ShopOrder } from "@/domain/shop-account";
import { useIdempotencyKey } from "@/lib/actions/idempotency";
import type { Locale } from "@/lib/i18n/locales";

import { FormAlert } from "../account/controls";
import { PhoneGate } from "../account/phone-gate";
import { failureText, useShopAction } from "../account/use-shop-action";
import { ordersCopy } from "../copy/orders";
import { shopPath } from "../routing/routes";
import { recoveryPhase } from "./recovery";

/** Saved purchases belong in the cart too; payment status/actions stay server-authoritative. */
export function CheckoutRecovery({
  locale,
  order,
  providers,
  busy,
  onBusyChange,
  onRestored,
}: {
  locale: Locale;
  order: ShopOrder;
  providers: ReadonlyArray<PaymentProvider>;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onRestored: (cart: ShopCart) => void;
}) {
  const copy = ordersCopy[locale];
  const t = copy.recovery;
  const router = useRouter();
  const { run, pending, error } = useShopAction(locale);
  const payKey = useIdempotencyKey();
  const editKey = useIdempotencyKey();
  const [gate, setGate] = useState(false);
  // Start identically on the server/client; update the deadline after hydration.
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [provider, setProvider] = useState<PaymentProvider>(
    providers.includes(order.payment.provider)
      ? order.payment.provider
      : (providers[0] ?? order.payment.provider),
  );
  const phase = recoveryPhase(order, now);
  const title =
    phase === "confirming"
      ? t.confirmingTitle
      : phase === "expired"
        ? t.expiredTitle
        : phase === "cancelled"
          ? t.cancelledTitle
          : t.title;
  const body =
    phase === "confirming"
      ? t.confirmingBody
      : phase === "expired"
        ? t.expiredBody
        : phase === "cancelled"
          ? t.cancelledBody
          : t.body;
  const canPay = phase === "pending" && order.actions.pay && providers.includes(provider);
  const canEdit = phase !== "confirming" && (order.actions.cancel || order.status === "cancelled");

  const pay = async () => {
    if (busy || pending) return;
    onBusyChange(true);
    const result = payKey.settle(
      await run((csrf) =>
        startPayment({
          locale,
          orderId: order.id,
          provider,
          idempotencyKey: payKey.key,
          csrf,
        }),
      ),
    );
    if (result.ok) {
      onBusyChange(false);
      window.location.assign(result.data.url);
      return;
    }
    onBusyChange(false);
    if (result.code === "phone_required") setGate(true);
    router.refresh();
  };

  const edit = async () => {
    if (busy || pending) return;
    onBusyChange(true);
    const result = editKey.settle(
      await run((csrf) =>
        reorder({
          locale,
          orderId: order.id,
          cancelUnpaid: true,
          idempotencyKey: editKey.key,
          csrf,
        }),
      ),
    );
    onBusyChange(false);
    if (result.ok) onRestored(result.data);
    router.refresh();
  };

  return (
    <section
      aria-labelledby="checkout-recovery-title"
      className="flex flex-col gap-5 rounded-lg border border-gold-ink/40 bg-surface-raised p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <Icon name="bag" size={24} className="mt-1 shrink-0 text-gold-ink" />
        <div className="flex flex-col gap-2">
          <h2
            id="checkout-recovery-title"
            className="m-0 font-serif text-[26px] leading-8 font-semibold"
          >
            {title}
          </h2>
          <p className="m-0 text-body text-ink-muted">{body}</p>
          <Link
            href={shopPath(locale, { kind: "order", slug: String(order.id) })}
            className="self-start text-body-sm text-ink underline underline-offset-4"
          >
            {t.details} · №{order.id}
          </Link>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {order.items.map((item) => (
          <li key={item.productId} className="flex items-center gap-3 py-4">
            {item.image ? (
              <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-image-well">
                <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
              </span>
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-label">{item.name}</span>
              <span className="text-body-sm text-ink-muted">
                {copy.order.quantityPrice(item.quantity, copy.money(item.unitPrice))}
              </span>
            </span>
            <span className="shrink-0 text-label tabular-nums">{copy.money(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="m-0 flex flex-col gap-2 border-t border-line pt-4 text-body">
        {order.fulfilment === "delivery" ? (
          <div className="flex justify-between gap-3">
            <dt>{copy.order.deliveryFee}</dt>
            <dd className="m-0">{copy.money(order.deliveryFee)}</dd>
          </div>
        ) : null}
        {order.cashbackUsed > 0 ? (
          <div className="flex justify-between gap-3">
            <dt>{copy.order.cashback}</dt>
            <dd className="m-0">−{copy.money(order.cashbackUsed)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3 text-subheading">
          <dt>{copy.order.total}</dt>
          <dd className="m-0 tabular-nums">{copy.money(order.total)}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-3 sm:max-w-md">
        {canPay ? (
          <>
            <label className="flex flex-col gap-2 text-label">
              {copy.checkout.paymentTitle}
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as PaymentProvider)}
                disabled={busy || pending}
                className="rounded-md border border-line-strong bg-surface-raised p-3 text-body"
              >
                {providers.map((value) => (
                  <option key={value} value={value}>
                    {copy.order.provider[value]}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="xl"
              onClick={() => void pay()}
              disabled={busy || pending}
              aria-busy={pending || undefined}
            >
              {t.continuePayment}
            </Button>
          </>
        ) : null}
        {canEdit ? (
          <Button
            variant={canPay ? "secondary" : "primary"}
            size="lg"
            onClick={() => void edit()}
            disabled={busy || pending}
            aria-busy={pending || undefined}
          >
            {order.status === "awaiting_payment" && phase !== "expired" ? t.edit : t.restore}
          </Button>
        ) : null}
        {canEdit && order.status === "awaiting_payment" ? (
          <p className="m-0 text-body-sm text-ink-muted">{t.editHint}</p>
        ) : null}
        {!providers.length && phase === "pending" ? (
          <p className="m-0 text-body-sm text-ink-muted">{copy.cart.noPayments}</p>
        ) : null}
        <Button variant="ghost" onClick={() => router.refresh()} disabled={busy || pending}>
          {t.refresh}
        </Button>
      </div>
      {error && error.code !== "phone_required" ? (
        <FormAlert>{failureText(error, locale)}</FormAlert>
      ) : null}
      <PhoneGate
        locale={locale}
        open={gate}
        onOpenChange={setGate}
        next={shopPath(locale, { kind: "cart" })}
        onAttached={() => {
          setGate(false);
          router.refresh();
        }}
      />
    </section>
  );
}

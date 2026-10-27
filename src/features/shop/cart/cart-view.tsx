"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { removeCartItem, setCartQuantity } from "@/data/shop/commerce.actions";
import type { ShopCart, ShopCartLine } from "@/domain/shop-account";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import { FormAlert } from "../account/controls";
import { useShopSession } from "../account/session-context";
import { failureText, useShopAction } from "../account/use-shop-action";
import { EmptyState } from "../components/empty-state";
import { ordersCopy } from "../copy/orders";
import { shopPath } from "../routing/routes";

/**
 * The cart island (contract §2.5): a quantity stepper per line (`PATCH` with
 * the absolute quantity, retry-safe), removal, the line problems the server
 * reports (`insufficient`, `out_of_stock`, `unavailable`, a changed price,
 * `max_reached`) and the summary with the way to checkout. Every change
 * answers the whole cart, which replaces the local copy and the header badge.
 */

interface CartViewProps {
  locale: Locale;
  initial: ShopCart;
  canCheckout: { sales: boolean; payments: boolean };
  supportPhone: string | null;
}

function Stepper({
  locale,
  line,
  busy,
  onChange,
}: {
  locale: Locale;
  line: ShopCartLine;
  busy: boolean;
  onChange: (quantity: number) => void;
}) {
  const copy = ordersCopy[locale].cart;
  const max = Math.max(line.maxQuantity, line.quantity);
  const button =
    "flex size-10 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-gold-soft disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:bg-transparent";
  return (
    <div
      role="group"
      aria-label={`${copy.quantity}: ${line.name}`}
      className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface-raised p-0.5"
    >
      <button
        type="button"
        className={button}
        aria-label={copy.decrease(line.name)}
        disabled={busy || line.quantity <= 1}
        onClick={() => onChange(line.quantity - 1)}
      >
        <Icon name="minus" size={18} />
      </button>
      <output aria-live="polite" className="min-w-8 text-center text-label tabular-nums">
        {line.quantity}
      </output>
      <button
        type="button"
        className={button}
        aria-label={copy.increase(line.name)}
        disabled={busy || line.quantity >= max || line.maxReached || line.status !== "ok"}
        onClick={() => onChange(line.quantity + 1)}
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

function LineProblem({ locale, line }: { locale: Locale; line: ShopCartLine }) {
  const copy = ordersCopy[locale].cart;
  if (line.status === "insufficient") return <>{copy.status.insufficient(line.available)}</>;
  if (line.status === "out_of_stock") return <>{copy.status.out_of_stock}</>;
  if (line.status === "unavailable") return <>{copy.status.unavailable}</>;
  return null;
}

export function CartView({ locale, initial, canCheckout, supportPhone }: CartViewProps) {
  const copy = ordersCopy[locale].cart;
  const money = ordersCopy[locale].money;
  const [cart, setCart] = useState(initial);
  const [busyLine, setBusyLine] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { run, error } = useShopAction(locale);
  const { setCartQuantity: setBadge } = useShopSession();

  const apply = (next: ShopCart) => {
    setCart(next);
    setBadge(next.quantityTotal);
  };

  const change = async (line: ShopCartLine, quantity: number) => {
    setBusyLine(line.productId);
    setNotice(null);
    const result = await run((csrf) =>
      setCartQuantity({ locale, productId: line.productId, quantity, csrf }),
    );
    setBusyLine(null);
    if (result.ok) apply(result.data);
  };

  const remove = async (line: ShopCartLine) => {
    setBusyLine(line.productId);
    const result = await run((csrf) => removeCartItem({ locale, productId: line.productId, csrf }));
    setBusyLine(null);
    if (result.ok) {
      apply(result.data);
      setNotice(copy.removed(line.name));
    }
  };

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="sr-only">
          {notice}
        </p>
        <EmptyState
          title={copy.emptyTitle}
          body={copy.emptyBody}
          action={
            <Link
              href={shopPath(locale, { kind: "catalog" })}
              className={buttonStyles({ size: "lg", lift: true })}
            >
              {copy.toCatalog}
              <Icon name="arrow-right" size={18} />
            </Link>
          }
        />
      </div>
    );
  }

  const blocked = cart.hasProblems || !canCheckout.sales || !canCheckout.payments;
  return (
    <div className="grid gap-8 nav:grid-cols-[minmax(0,1fr)_360px] nav:items-start nav:gap-12">
      <section aria-labelledby="cart-lines" className="flex flex-col">
        <h2 id="cart-lines" className="sr-only">
          {copy.items(cart.quantityTotal)}
        </h2>
        <p role="status" className="m-0 min-h-0 text-body-sm text-ink-muted empty:hidden">
          {notice}
        </p>
        <ul className="m-0 flex list-none flex-col p-0">
          {cart.lines.map((line) => {
            const problem = line.status !== "ok";
            return (
              <li
                key={line.productId}
                className={cn(
                  "grid grid-cols-[88px_minmax(0,1fr)] gap-4 border-b border-line py-6 first:pt-0 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:gap-6",
                  busyLine === line.productId && "opacity-70",
                )}
              >
                <div className="relative aspect-product w-full overflow-hidden rounded-md bg-image-well">
                  {line.image ? (
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-ink-muted">
                      <Icon name="image" size={24} />
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {line.promo ? (
                      <Badge tone="gold" dot={false}>
                        {copy.promo}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="m-0 font-serif text-[22px] leading-7 font-semibold text-ink">
                    {line.name}
                  </p>
                  {line.volume ? (
                    <p className="m-0 text-body-sm text-ink-muted">{line.volume}</p>
                  ) : null}
                  <p className="m-0 text-label text-ink tabular-nums">
                    {money(line.unitPrice)}
                    {line.priceChanged && line.previousPrice !== null ? (
                      <span className="ml-2 text-body-sm font-normal text-ink-muted">
                        {copy.priceChanged(money(line.previousPrice))}
                      </span>
                    ) : null}
                  </p>
                  {problem ? (
                    <p className="m-0 flex items-center gap-1.5 text-body-sm font-semibold text-danger-strong">
                      <Icon name="alert-circle" size={16} />
                      <LineProblem locale={locale} line={line} />
                    </p>
                  ) : line.maxReached ? (
                    <p className="m-0 text-body-sm text-ink-muted">{copy.maxReached}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3 sm:hidden">
                    <Stepper
                      locale={locale}
                      line={line}
                      busy={busyLine !== null}
                      onChange={(q) => void change(line, q)}
                    />
                    <span className="text-label tabular-nums">{money(line.lineTotal)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(line)}
                    disabled={busyLine !== null}
                    aria-label={copy.removeLabel(line.name)}
                    className="mt-1 inline-flex items-center gap-1.5 self-start text-body-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-60"
                  >
                    <Icon name="trash" size={16} />
                    {copy.remove}
                  </button>
                </div>
                <div className="hidden flex-col items-end gap-3 sm:flex">
                  <Stepper
                    locale={locale}
                    line={line}
                    busy={busyLine !== null}
                    onChange={(q) => void change(line, q)}
                  />
                  <span className="text-price text-ink tabular-nums">{money(line.lineTotal)}</span>
                </div>
              </li>
            );
          })}
        </ul>
        {error ? <FormAlert className="mt-4">{failureText(error, locale)}</FormAlert> : null}
      </section>

      <aside
        aria-labelledby="cart-summary"
        className="flex flex-col gap-5 rounded-lg border border-line bg-surface-raised p-6 nav:sticky nav:top-6"
      >
        <h2
          id="cart-summary"
          className="m-0 font-serif text-[26px] leading-8 font-semibold text-ink"
        >
          {copy.summary}
        </h2>
        <dl className="m-0 flex flex-col gap-3 text-body">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">{copy.items(cart.quantityTotal)}</dt>
            <dd className="m-0 font-semibold tabular-nums">{money(cart.itemsSubtotal)}</dd>
          </div>
          {cart.cashbackAvailable > 0 ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">{copy.cashbackAvailable}</dt>
              <dd className="m-0 font-semibold text-ink tabular-nums">
                {money(cart.cashbackAvailable)}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-4">
          <span className="text-subheading">{copy.subtotal}</span>
          <span className="text-price-lg tabular-nums">{money(cart.itemsSubtotal)}</span>
        </div>
        <p className="m-0 text-body-sm text-ink-muted">{copy.deliveryNote}</p>
        {!canCheckout.sales ? (
          <FormAlert>{copy.salesOff}</FormAlert>
        ) : !canCheckout.payments ? (
          <FormAlert>{copy.noPayments}</FormAlert>
        ) : cart.hasProblems ? (
          <FormAlert>{copy.fixProblems}</FormAlert>
        ) : null}
        {blocked ? (
          <span
            className={buttonStyles({
              size: "xl",
              className: "pointer-events-none w-full bg-line text-ink-muted",
            })}
            aria-disabled="true"
          >
            {copy.checkout}
          </span>
        ) : (
          <Link
            href={shopPath(locale, { kind: "checkout" })}
            className={buttonStyles({ size: "xl", lift: true, className: "w-full" })}
          >
            {copy.checkout}
            <Icon name="arrow-right" size={18} />
          </Link>
        )}
        {supportPhone && cart.lines.some((line) => line.maxReached) ? (
          <a
            href={`tel:${supportPhone}`}
            className="text-center text-label text-ink underline decoration-gold underline-offset-4"
          >
            {copy.support}
          </a>
        ) : null}
      </aside>
    </div>
  );
}
